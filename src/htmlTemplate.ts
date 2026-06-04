import * as vscode from 'vscode';

export interface HtmlTemplateOptions {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  bodyHtml: string;
  nonce: string;
}

export function buildPreviewHtml(options: HtmlTemplateOptions): string {
  const previewCssUri = options.webview.asWebviewUri(
    vscode.Uri.joinPath(options.extensionUri, 'media', 'preview.css')
  );
  const highlightCssUri = options.webview.asWebviewUri(
    vscode.Uri.joinPath(options.extensionUri, 'media', 'highlight.css')
  );
  // CSP 安全策略：
  // 默认什么都不许加载
  // 图片只能从允许的位置加载
  // CSS 只能从插件自己的资源加载
  // JS 脚本默认不允许随便执行
  const csp = [
    `default-src 'none'`,
    `img-src ${options.webview.cspSource} https: http: data:`,
    `style-src ${options.webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${options.nonce}'`
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${previewCssUri}">
  <link rel="stylesheet" href="${highlightCssUri}">
  <title>Pretty Markdown Preview</title>
</head>
<body>
  <main class="markdown-body">
    ${options.bodyHtml}
  </main>
</body>
</html>`;
}

export function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';

  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return nonce;
}
