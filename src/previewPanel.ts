import * as path from 'node:path';
import * as vscode from 'vscode';
import { rewriteMarkdownImageSources } from './assetResolver';
import { PREVIEW_TITLE, PREVIEW_VIEW_TYPE } from './constants';
import { buildPreviewHtml, createNonce, type PreviewScrollSyncState } from './htmlTemplate';
import { renderMarkdown } from './markdownRenderer';

export class PreviewPanel {
  // 当前只维护一个美化预览面板：重复执行命令时复用它，而不是打开多个窗口。
  private static currentPanel: PreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private document: vscode.TextDocument;
  private refreshTimer: NodeJS.Timeout | undefined;
  private lastScrollSyncState: PreviewScrollSyncState | undefined;
  private disposed = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, document: vscode.TextDocument) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.document = document;

    this.panel.onDidDispose(() => this.dispose());
    this.panel.webview.onDidReceiveMessage((message) => this.handleWebviewMessage(message));
    this.rememberVisibleEditorScroll(document);
    this.updateNow();
  }

  static openOrUpdate(extensionUri: vscode.Uri, document: vscode.TextDocument): void {
    // 已有面板时切换到当前 Markdown 文档，并刷新本地图片可访问目录。
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.document = document;
      PreviewPanel.currentPanel.updateLocalResourceRoots();
      PreviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      PreviewPanel.currentPanel.rememberVisibleEditorScroll(document);
      PreviewPanel.currentPanel.scheduleUpdate();
      return;
    }

    // 首次打开时在编辑器旁边创建 Webview 面板，资源访问只放开插件样式和当前文档目录。
    const panel = vscode.window.createWebviewPanel(
      PREVIEW_VIEW_TYPE,
      PREVIEW_TITLE,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
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
    PreviewPanel.currentPanel.rememberVisibleEditorScroll(document);
    PreviewPanel.currentPanel.scheduleUpdate();
  }

  static syncScrollWithEditor(editor: vscode.TextEditor): void {
    // 只同步当前正在预览的 Markdown 文档，避免其他编辑器滚动影响预览。
    if (!PreviewPanel.currentPanel) {
      return;
    }

    if (PreviewPanel.currentPanel.document.uri.toString() !== editor.document.uri.toString()) {
      return;
    }

    PreviewPanel.currentPanel.syncScroll(editor);
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
        nonce: createNonce(),
        initialScrollSyncState: this.lastScrollSyncState
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.panel.webview.html = `<html><body><h1>Preview failed</h1><pre>${escapeHtml(message)}</pre></body></html>`;
    }
  }

  private syncScroll(editor: vscode.TextEditor): void {
    this.rememberEditorScroll(editor);
    this.panel.webview.postMessage({
      type: 'syncScroll',
      ...this.lastScrollSyncState
    });
  }

  private rememberVisibleEditorScroll(document: vscode.TextDocument): void {
    const editor = this.getVisibleEditor(document);

    if (!editor) {
      return;
    }

    this.rememberEditorScroll(editor);
  }

  private rememberEditorScroll(editor: vscode.TextEditor): void {
    this.lastScrollSyncState = getEditorScrollSyncState(editor);
  }

  private getVisibleEditor(document: vscode.TextDocument): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find(
      (visibleEditor) => visibleEditor.document.uri.toString() === document.uri.toString()
    );
  }

  private handleWebviewMessage(message: unknown): void {
    if (!isPreviewReadyMessage(message)) {
      return;
    }

    this.syncVisibleEditorScroll();
  }

  private syncVisibleEditorScroll(): void {
    const editor = this.getVisibleEditor(this.document);

    if (!editor) {
      return;
    }

    this.syncScroll(editor);
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

function getEditorScrollSyncState(editor: vscode.TextEditor): {
  sourceLine: number;
  maxLine: number;
  fallbackRatio: number;
} {
  const visibleRange = editor.visibleRanges[0];
  const totalLines = editor.document.lineCount;
  const maxLine = Math.max(0, totalLines - 1);

  if (!visibleRange || totalLines <= 1) {
    return {
      sourceLine: 0,
      maxLine,
      fallbackRatio: 0
    };
  }

  const visibleLineCount = Math.max(1, visibleRange.end.line - visibleRange.start.line + 1);
  const maxTopLine = Math.max(1, totalLines - visibleLineCount);

  return {
    sourceLine: clamp(visibleRange.start.line, 0, maxLine),
    maxLine,
    fallbackRatio: clamp(visibleRange.start.line / maxTopLine, 0, 1)
  };
}

function isPreviewReadyMessage(message: unknown): message is { type: 'previewReady' } {
  return typeof message === 'object' && message !== null && 'type' in message && message.type === 'previewReady';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
