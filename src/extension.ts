import * as vscode from 'vscode';
import { OPEN_PREVIEW_COMMAND } from './constants';
import { PreviewPanel } from './previewPanel';

export function activate(context: vscode.ExtensionContext): void {
  // 命令入口：确认当前编辑器是 Markdown 文件，然后打开或刷新美化预览。
  const openPreview = vscode.commands.registerCommand(OPEN_PREVIEW_COMMAND, () => {
    const document = getActiveMarkdownDocument();

    if (!document) {
      vscode.window.showInformationMessage('Please open a Markdown file before starting Pretty Markdown Preview.');
      return;
    }

    PreviewPanel.openOrUpdate(context.extensionUri, document);
  });

  // Markdown 文档内容变化时，通知预览面板按防抖策略重新渲染。
  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId !== 'markdown') {
      return;
    }

    PreviewPanel.updateIfPreviewing(event.document);
  });

  context.subscriptions.push(openPreview, changeListener);
}

export function deactivate(): void {}

function getActiveMarkdownDocument(): vscode.TextDocument | undefined {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return undefined;
  }

  if (editor.document.languageId !== 'markdown') {
    return undefined;
  }

  return editor.document;
}
