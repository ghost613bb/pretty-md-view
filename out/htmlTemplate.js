"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPreviewHtml = buildPreviewHtml;
exports.createNonce = createNonce;
const vscode = __importStar(require("vscode"));
function buildPreviewHtml(options) {
    const previewCssUri = options.webview.asWebviewUri(vscode.Uri.joinPath(options.extensionUri, 'media', 'preview.css'));
    const highlightCssUri = options.webview.asWebviewUri(vscode.Uri.joinPath(options.extensionUri, 'media', 'highlight.css'));
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
  <div class="image-preview" data-image-preview hidden>
    <button class="image-preview__close" type="button" aria-label="Close image preview">&times;</button>
    <img class="image-preview__image" alt="">
  </div>
  <script nonce="${options.nonce}">
    (() => {
      const preview = document.querySelector('[data-image-preview]');
      const previewImage = preview?.querySelector('.image-preview__image');
      const closeButton = preview?.querySelector('.image-preview__close');

      if (!preview || !previewImage || !closeButton) {
        return;
      }

      const syncScroll = (ratio) => {
        if (document.body.classList.contains('is-previewing-image')) {
          return;
        }

        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        const maxScrollTop = Math.max(0, scrollHeight - window.innerHeight);
        const nextScrollTop = maxScrollTop * Math.min(Math.max(ratio, 0), 1);

        window.scrollTo({
          top: nextScrollTop,
          behavior: 'auto'
        });
      };

      window.addEventListener('message', (event) => {
        const message = event.data;

        if (!message || message.type !== 'syncScroll' || typeof message.ratio !== 'number') {
          return;
        }

        window.requestAnimationFrame(() => syncScroll(message.ratio));
      });

      const closePreview = () => {
        preview.hidden = true;
        previewImage.removeAttribute('src');
        previewImage.removeAttribute('alt');
        document.body.classList.remove('is-previewing-image');
      };

      document.querySelectorAll('.markdown-body img').forEach((image) => {
        image.addEventListener('click', () => {
          previewImage.src = image.currentSrc || image.src;
          previewImage.alt = image.alt || 'Preview image';
          preview.hidden = false;
          document.body.classList.add('is-previewing-image');
        });
      });

      preview.addEventListener('click', (event) => {
        if (event.target === preview) {
          closePreview();
        }
      });

      closeButton.addEventListener('click', closePreview);

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !preview.hidden) {
          closePreview();
        }
      });
    })();
  </script>
</body>
</html>`;
}
function createNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i += 1) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
//# sourceMappingURL=htmlTemplate.js.map