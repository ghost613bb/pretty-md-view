"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdown = renderMarkdown;
const highlight_js_1 = __importDefault(require("highlight.js"));
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_task_lists_1 = __importDefault(require("markdown-it-task-lists"));
const ALLOWED_HTML_TAGS = new Set([
    'a',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'img',
    'input',
    'label',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'span',
    'strong',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'ul'
]);
const ALLOWED_HTML_ATTRIBUTES = new Set([
    'align',
    'alt',
    'checked',
    'class',
    'colspan',
    'disabled',
    'height',
    'href',
    'rowspan',
    'src',
    'title',
    'type',
    'width'
]);
const markdown = new markdown_it_1.default({
    html: true,
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
    return sanitizeHtml(markdown.render(source));
}
function sanitizeHtml(html) {
    return html.replace(/<\/?([a-z][a-z0-9-]*)(\s[^<>]*)?>/gi, (match, tagName, attributes = '') => {
        const normalizedTagName = tagName.toLowerCase();
        if (!ALLOWED_HTML_TAGS.has(normalizedTagName)) {
            return escapeHtml(match);
        }
        if (match.startsWith('</')) {
            return `</${normalizedTagName}>`;
        }
        const sanitizedAttributes = sanitizeAttributes(attributes);
        const selfClosing = match.endsWith('/>') ? ' /' : '';
        return `<${normalizedTagName}${sanitizedAttributes}${selfClosing}>`;
    });
}
function sanitizeAttributes(attributes) {
    const sanitized = [];
    const attributePattern = /\s+([^\s=\"'<>`]+)(?:\s*=\s*(\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>`]+)))?/g;
    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(attributes)) !== null) {
        const attributeName = attributeMatch[1].toLowerCase();
        if (!ALLOWED_HTML_ATTRIBUTES.has(attributeName) || attributeName.startsWith('on')) {
            continue;
        }
        const attributeValue = attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? '';
        if ((attributeName === 'href' || attributeName === 'src') && !isSafeUri(attributeValue)) {
            continue;
        }
        if (attributeMatch[2] === undefined) {
            sanitized.push(attributeName);
            continue;
        }
        sanitized.push(`${attributeName}="${escapeHtml(attributeValue)}"`);
    }
    return sanitized.length > 0 ? ` ${sanitized.join(' ')}` : '';
}
function isSafeUri(value) {
    return /^(?!\s*javascript:)(?!\s*vbscript:)/i.test(value);
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