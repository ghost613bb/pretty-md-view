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
exports.PreviewPanel = void 0;
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const assetResolver_1 = require("./assetResolver");
const constants_1 = require("./constants");
const htmlTemplate_1 = require("./htmlTemplate");
const markdownRenderer_1 = require("./markdownRenderer");
class PreviewPanel {
    // 当前只维护一个美化预览面板：重复执行命令时复用它，而不是打开多个窗口。
    static currentPanel;
    panel;
    extensionUri;
    document;
    refreshTimer;
    disposed = false;
    constructor(panel, extensionUri, document) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.document = document;
        this.panel.onDidDispose(() => this.dispose());
        this.updateNow();
    }
    static openOrUpdate(extensionUri, document) {
        // 已有面板时切换到当前 Markdown 文档，并刷新本地图片可访问目录。
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.document = document;
            PreviewPanel.currentPanel.updateLocalResourceRoots();
            PreviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
            PreviewPanel.currentPanel.scheduleUpdate();
            return;
        }
        // 首次打开时在编辑器旁边创建 Webview 面板，资源访问只放开插件样式和当前文档目录。
        const panel = vscode.window.createWebviewPanel(constants_1.PREVIEW_VIEW_TYPE, constants_1.PREVIEW_TITLE, vscode.ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.file(path.dirname(document.uri.fsPath))
            ]
        });
        PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, document);
    }
    static updateIfPreviewing(document) {
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
    static syncScrollWithEditor(editor) {
        // 只同步当前正在预览的 Markdown 文档，避免其他编辑器滚动影响预览。
        if (!PreviewPanel.currentPanel) {
            return;
        }
        if (PreviewPanel.currentPanel.document.uri.toString() !== editor.document.uri.toString()) {
            return;
        }
        PreviewPanel.currentPanel.syncScroll(editor);
    }
    scheduleUpdate() {
        // 文档变化很频繁，等待 200ms 再渲染，减少连续输入时的重复刷新。
        if (this.disposed) {
            return;
        }
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = setTimeout(() => this.updateNow(), 200);
    }
    updateNow() {
        try {
            const documentDir = path.dirname(this.document.uri.fsPath);
            // Markdown 源码先渲染成正文 HTML，再把本地相对图片改成 Webview 可访问 URI。
            const rendered = (0, markdownRenderer_1.renderMarkdown)(this.document.getText());
            const bodyHtml = (0, assetResolver_1.rewriteMarkdownImageSources)(rendered, (src) => {
                const diskUri = vscode.Uri.file(path.resolve(documentDir, src));
                return this.panel.webview.asWebviewUri(diskUri).toString();
            });
            // 最后把正文 HTML 放进完整页面模板，注入 CSS、CSP 和一次性 nonce。
            this.panel.webview.html = (0, htmlTemplate_1.buildPreviewHtml)({
                webview: this.panel.webview,
                extensionUri: this.extensionUri,
                bodyHtml,
                nonce: (0, htmlTemplate_1.createNonce)()
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.panel.webview.html = `<html><body><h1>Preview failed</h1><pre>${escapeHtml(message)}</pre></body></html>`;
        }
    }
    syncScroll(editor) {
        this.panel.webview.postMessage({
            type: 'syncScroll',
            ...getEditorScrollSyncState(editor)
        });
    }
    updateLocalResourceRoots() {
        // 切换预览文档后，本地图片允许访问的目录也要跟着切换到新文档所在目录。
        this.panel.webview.options = {
            ...this.panel.webview.options,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'media'),
                vscode.Uri.file(path.dirname(this.document.uri.fsPath))
            ]
        };
    }
    dispose() {
        // 面板关闭后清理静态引用和未触发的刷新定时器，下次命令可以重新创建。
        this.disposed = true;
        PreviewPanel.currentPanel = undefined;
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }
}
exports.PreviewPanel = PreviewPanel;
function getEditorScrollSyncState(editor) {
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
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
//# sourceMappingURL=previewPanel.js.map