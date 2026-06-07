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
      let lastSyncMessage;

      if (!preview || !previewImage || !closeButton) {
        return;
      }

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const getMaxScrollTop = () => {
        const scrollHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );

        return Math.max(0, scrollHeight - window.innerHeight);
      };

      const getFallbackScrollTop = (message) => {
        const fallbackRatio = typeof message.fallbackRatio === 'number' ? message.fallbackRatio : message.ratio;
        return getMaxScrollTop() * clamp(typeof fallbackRatio === 'number' ? fallbackRatio : 0, 0, 1);
      };

      const getSourceLineAnchors = () => {
        const anchors = Array.from(document.querySelectorAll('[data-pmv-source-line]'))
          .map((element) => ({
            line: Number(element.getAttribute('data-pmv-source-line')),
            top: element.getBoundingClientRect().top + window.scrollY
          }))
          .filter((anchor) => Number.isFinite(anchor.line) && Number.isFinite(anchor.top))
          .sort((a, b) => a.line - b.line || a.top - b.top);

        return anchors.reduce((uniqueAnchors, anchor) => {
          const previous = uniqueAnchors[uniqueAnchors.length - 1];

          if (previous && previous.line === anchor.line) {
            previous.top = Math.min(previous.top, anchor.top);
            return uniqueAnchors;
          }

          uniqueAnchors.push(anchor);
          return uniqueAnchors;
        }, []);
      };

      const interpolate = (fromTop, toTop, progress) => {
        return fromTop + (toTop - fromTop) * clamp(progress, 0, 1);
      };

      const calculateAnchorScrollTop = (message) => {
        const sourceLine = message.sourceLine;
        const maxLine = typeof message.maxLine === 'number' ? Math.max(0, message.maxLine) : sourceLine;
        const maxScrollTop = getMaxScrollTop();
        const anchors = getSourceLineAnchors();

        if (anchors.length === 0) {
          return getFallbackScrollTop(message);
        }

        const firstAnchor = anchors[0];
        const lastAnchor = anchors[anchors.length - 1];

        if (sourceLine <= firstAnchor.line) {
          const progress = firstAnchor.line === 0 ? 0 : sourceLine / firstAnchor.line;
          return interpolate(0, firstAnchor.top, progress);
        }

        for (let index = 0; index < anchors.length - 1; index += 1) {
          const previousAnchor = anchors[index];
          const nextAnchor = anchors[index + 1];

          if (sourceLine >= previousAnchor.line && sourceLine <= nextAnchor.line) {
            const lineDistance = Math.max(1, nextAnchor.line - previousAnchor.line);
            const progress = (sourceLine - previousAnchor.line) / lineDistance;
            return interpolate(previousAnchor.top, nextAnchor.top, progress);
          }
        }

        const remainingLines = Math.max(1, maxLine - lastAnchor.line);
        const progress = (sourceLine - lastAnchor.line) / remainingLines;
        return interpolate(lastAnchor.top, maxScrollTop, progress);
      };

      const syncScroll = (message) => {
        if (document.body.classList.contains('is-previewing-image')) {
          return;
        }

        const maxScrollTop = getMaxScrollTop();
        const nextScrollTop = Number.isFinite(message.sourceLine)
          ? calculateAnchorScrollTop(message)
          : getFallbackScrollTop(message);

        window.scrollTo({
          top: clamp(nextScrollTop, 0, maxScrollTop),
          behavior: 'auto'
        });
      };

      const isSyncScrollMessage = (message) => {
        if (!message || message.type !== 'syncScroll') {
          return false;
        }

        return typeof message.sourceLine === 'number' || typeof message.fallbackRatio === 'number' || typeof message.ratio === 'number';
      };

      const scheduleLastSync = () => {
        if (!lastSyncMessage) {
          return;
        }

        window.requestAnimationFrame(() => syncScroll(lastSyncMessage));
      };

      window.addEventListener('message', (event) => {
        const message = event.data;

        if (!isSyncScrollMessage(message)) {
          return;
        }

        lastSyncMessage = message;
        scheduleLastSync();
      });

      window.addEventListener('resize', scheduleLastSync);

      const closePreview = () => {
        preview.hidden = true;
        previewImage.removeAttribute('src');
        previewImage.removeAttribute('alt');
        document.body.classList.remove('is-previewing-image');
      };

      document.querySelectorAll('.markdown-body img').forEach((image) => {
        image.addEventListener('load', scheduleLastSync);
        image.addEventListener('error', scheduleLastSync);
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