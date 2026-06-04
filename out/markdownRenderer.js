"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdown = renderMarkdown;
const highlight_js_1 = __importDefault(require("highlight.js"));
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_task_lists_1 = __importDefault(require("markdown-it-task-lists"));
const markdown = new markdown_it_1.default({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight(code, language) {
        if (language && highlight_js_1.default.getLanguage(language)) {
            try {
                return `<pre><code class="hljs language-${escapeHtml(language)}">${highlight_js_1.default.highlight(code, {
                    language,
                    ignoreIllegals: true
                }).value}</code></pre>`;
            }
            catch {
                return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
            }
        }
        return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
    }
})
    .enable('table')
    .use(markdown_it_task_lists_1.default, { enabled: false, label: true, labelAfter: true });
function renderMarkdown(source) {
    return markdown.render(source);
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
//# sourceMappingURL=markdownRenderer.js.map