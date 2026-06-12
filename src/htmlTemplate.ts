import * as vscode from 'vscode';

export interface PreviewScrollSyncState {
  sourceLine: number;
  maxLine: number;
  fallbackRatio: number;
}

export interface HtmlTemplateOptions {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  bodyHtml: string;
  nonce: string;
  initialScrollSyncState?: PreviewScrollSyncState;
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
  <div class="image-preview" data-image-preview hidden>
    <div class="image-preview__toolbar" aria-label="Image preview controls">
      <button class="image-preview__control" type="button" data-image-zoom-out aria-label="Zoom out">−</button>
      <button class="image-preview__control" type="button" data-image-zoom-reset aria-label="Reset zoom">100%</button>
      <button class="image-preview__control" type="button" data-image-zoom-in aria-label="Zoom in">＋</button>
    </div>
    <button class="image-preview__close" type="button" aria-label="Close image preview">&times;</button>
    <img class="image-preview__image" alt="">
  </div>
  <script nonce="${options.nonce}">
    (() => {
      const preview = document.querySelector('[data-image-preview]');
      const previewImage = preview?.querySelector('.image-preview__image');
      const closeButton = preview?.querySelector('.image-preview__close');
      const zoomInButton = preview?.querySelector('[data-image-zoom-in]');
      const zoomOutButton = preview?.querySelector('[data-image-zoom-out]');
      const zoomResetButton = preview?.querySelector('[data-image-zoom-reset]');
      const initialSyncMessage = ${options.initialScrollSyncState
        ? JSON.stringify({ type: 'syncScroll', ...options.initialScrollSyncState })
        : 'undefined'};
      let lastSyncMessage;
      let imageScale = 1;
      let imageOffsetX = 0;
      let imageOffsetY = 0;
      let draggingImage = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartOffsetX = 0;
      let dragStartOffsetY = 0;

      if (!preview || !previewImage || !closeButton || !zoomInButton || !zoomOutButton || !zoomResetButton) {
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

      if (isSyncScrollMessage(initialSyncMessage)) {
        lastSyncMessage = initialSyncMessage;
        scheduleLastSync();
      }

      window.addEventListener('resize', scheduleLastSync);

      const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
      vscodeApi?.postMessage({ type: 'previewReady' });

      const updateImageTransform = () => {
        previewImage.style.setProperty('--pmv-image-scale', String(imageScale));
        previewImage.style.setProperty('--pmv-image-offset-x', imageOffsetX + 'px');
        previewImage.style.setProperty('--pmv-image-offset-y', imageOffsetY + 'px');
        zoomResetButton.textContent = Math.round(imageScale * 100) + '%';
      };

      const setImageScale = (nextScale) => {
        imageScale = clamp(nextScale, 0.25, 6);
        updateImageTransform();
      };

      const resetImageTransform = () => {
        imageScale = 1;
        imageOffsetX = 0;
        imageOffsetY = 0;
        updateImageTransform();
      };

      const setImageOffset = (nextOffsetX, nextOffsetY) => {
        imageOffsetX = nextOffsetX;
        imageOffsetY = nextOffsetY;
        updateImageTransform();
      };

      const closePreview = () => {
        preview.hidden = true;
        previewImage.removeAttribute('src');
        previewImage.removeAttribute('alt');
        previewImage.style.removeProperty('--pmv-image-scale');
        previewImage.style.removeProperty('--pmv-image-offset-x');
        previewImage.style.removeProperty('--pmv-image-offset-y');
        draggingImage = false;
        resetImageTransform();
        previewImage.classList.remove('is-dragging');
        document.body.classList.remove('is-previewing-image');
      };

      document.querySelectorAll('.markdown-body img').forEach((image) => {
        image.addEventListener('load', scheduleLastSync);
        image.addEventListener('error', scheduleLastSync);
        image.addEventListener('click', () => {
          previewImage.src = image.currentSrc || image.src;
          previewImage.alt = image.alt || 'Preview image';
          resetImageTransform();
          preview.hidden = false;
          document.body.classList.add('is-previewing-image');
        });
      });

      zoomInButton.addEventListener('click', () => setImageScale(imageScale + 0.25));
      zoomOutButton.addEventListener('click', () => setImageScale(imageScale - 0.25));
      zoomResetButton.addEventListener('click', resetImageTransform);

      previewImage.addEventListener('dblclick', () => {
        if (imageScale === 1) {
          setImageScale(2);
          return;
        }

        resetImageTransform();
      });

      previewImage.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        draggingImage = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartOffsetX = imageOffsetX;
        dragStartOffsetY = imageOffsetY;
        previewImage.classList.add('is-dragging');
        previewImage.setPointerCapture(event.pointerId);
      });

      previewImage.addEventListener('pointermove', (event) => {
        if (!draggingImage) {
          return;
        }

        setImageOffset(
          dragStartOffsetX + event.clientX - dragStartX,
          dragStartOffsetY + event.clientY - dragStartY
        );
      });

      const stopImageDrag = (event) => {
        draggingImage = false;
        previewImage.classList.remove('is-dragging');

        if (previewImage.hasPointerCapture(event.pointerId)) {
          previewImage.releasePointerCapture(event.pointerId);
        }
      };

      previewImage.addEventListener('pointerup', stopImageDrag);
      previewImage.addEventListener('pointercancel', stopImageDrag);

      preview.addEventListener('wheel', (event) => {
        event.preventDefault();
        setImageScale(imageScale + (event.deltaY < 0 ? 0.15 : -0.15));
      }, { passive: false });

      preview.addEventListener('click', (event) => {
        if (event.target === preview) {
          closePreview();
        }
      });

      closeButton.addEventListener('click', closePreview);

      document.addEventListener('keydown', (event) => {
        if (preview.hidden) {
          return;
        }

        if (event.key === 'Escape') {
          closePreview();
          return;
        }

        if (event.key === '+' || event.key === '=') {
          setImageScale(imageScale + 0.25);
          return;
        }

        if (event.key === '-') {
          setImageScale(imageScale - 0.25);
          return;
        }

        if (event.key === '0') {
          resetImageTransform();
        }
      });
    })();
  </script>
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
