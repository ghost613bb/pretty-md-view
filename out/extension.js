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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const constants_1 = require("./constants");
const previewPanel_1 = require("./previewPanel");
function activate(context) {
    // 命令入口：确认当前编辑器是 Markdown 文件，然后打开或刷新美化预览。
    const openPreview = vscode.commands.registerCommand(constants_1.OPEN_PREVIEW_COMMAND, () => {
        const document = getActiveMarkdownDocument();
        if (!document) {
            vscode.window.showInformationMessage('Please open a Markdown file before starting Pretty Markdown Preview.');
            return;
        }
        previewPanel_1.PreviewPanel.openOrUpdate(context.extensionUri, document);
    });
    // Markdown 文档内容变化时，通知预览面板按防抖策略重新渲染。
    const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId !== 'markdown') {
            return;
        }
        previewPanel_1.PreviewPanel.updateIfPreviewing(event.document);
    });
    // Markdown 编辑器滚动时，将可视区域位置同步给右侧预览面板。
    const visibleRangeListener = vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (event.textEditor.document.languageId !== 'markdown') {
            return;
        }
        previewPanel_1.PreviewPanel.syncScrollWithEditor(event.textEditor);
    });
    context.subscriptions.push(openPreview, changeListener, visibleRangeListener);
}
function deactivate() { }
function getActiveMarkdownDocument() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }
    if (editor.document.languageId !== 'markdown') {
        return undefined;
    }
    return editor.document;
}
//# sourceMappingURL=extension.js.map