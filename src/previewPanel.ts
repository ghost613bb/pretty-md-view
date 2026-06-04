import * as path from 'node:path';
import * as vscode from 'vscode';
import { rewriteMarkdownImageSources } from './assetResolver';
import { PREVIEW_TITLE, PREVIEW_VIEW_TYPE } from './constants';
import { buildPreviewHtml, createNonce } from './htmlTemplate';
import { renderMarkdown } from './markdownRenderer';

export class PreviewPanel {
  // 当前只维护一个美化预览面板：重复执行命令时复用它，而不是打开多个窗口。
  private static currentPanel: PreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private document: vscode.TextDocument;
  private refreshTimer: NodeJS.Timeout | undefined;
  private disposed = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document: vscode.TextDocument) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.document = document;

    this.panel.onDidDispose(() => this.dispose());
    this.updateNow();
  }

  static openOrUpdate(extensionUri: vscode.Uri, document: vscode.TextDocument): void {
    // 已有面板时切换到当前 Markdown 文档，并刷新本地图片可访问目录。
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.document = document;
      PreviewPanel.currentPanel.updateLocalResourceRoots();
      PreviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      PreviewPanel.currentPanel.scheduleUpdate();
      return;
    }

    // 首次打开时在编辑器旁边创建 Webview 面板，资源访问只放开插件样式和当前文档目录。
    const panel = vscode.window.createWebviewPanel(
      PREVIEW_VIEW_TYPE,
      PREVIEW_TITLE,
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.file(path.dirname(document.uri.fsPath))
        ]
      }
    );

    PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, document);
  }

  static updateIfPreviewing(document: vscode.TextDocument): void {
    // 只刷新当前正在预览的 Markdown 文档，避免别的文件改动影响这个面板。
    if (!PreviewPanel.currentPanel) {
      return;
    }

    if (PreviewPanel.currentPanel.document.uri.toString() !== document.uri.toString()) {
      return;
    }

    PreviewPanel.currentPanel.document = document;
    PreviewPanel.currentPanel.scheduleUpdate();
  }

  private scheduleUpdate(): void {
    // 文档变化很频繁，等待 200ms 再渲染，减少连续输入时的重复刷新。
    if (this.disposed) {
      return;
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => this.updateNow(), 200);
  }

  private updateNow(): void {
    try {
      const documentDir = path.dirname(this.document.uri.fsPath);
      // Markdown 源码先渲染成正文 HTML，再把本地相对图片改成 Webview 可访问 URI。
      const rendered = renderMarkdown(this.document.getText());
      const bodyHtml = rewriteMarkdownImageSources(rendered, (src) => {
        const diskUri = vscode.Uri.file(path.resolve(documentDir, src));
        return this.panel.webview.asWebviewUri(diskUri).toString();
      });

      // 最后把正文 HTML 放进完整页面模板，注入 CSS、CSP 和一次性 nonce。
      this.panel.webview.html = buildPreviewHtml({
        webview: this.panel.webview,
        extensionUri: this.extensionUri,
        bodyHtml,
        nonce: createNonce()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.panel.webview.html = `<html><body><h1>Preview failed</h1><pre>${escapeHtml(message)}</pre></body></html>`;
    }
  }

  private updateLocalResourceRoots(): void {
    // 切换预览文档后，本地图片允许访问的目录也要跟着切换到新文档所在目录。
    this.panel.webview.options = {
      ...this.panel.webview.options,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'media'),
        vscode.Uri.file(path.dirname(this.document.uri.fsPath))
      ]
    };
  }

  private dispose(): void {
    // 面板关闭后清理静态引用和未触发的刷新定时器，下次命令可以重新创建。
    this.disposed = true;
    PreviewPanel.currentPanel = undefined;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
