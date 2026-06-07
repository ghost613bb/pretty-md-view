"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdown = renderMarkdown;
const highlight_js_1 = __importDefault(require("highlight.js"));
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_task_lists_1 = __importDefault(require("markdown-it-task-lists"));
const SOURCE_LINE_ATTRIBUTE = 'data-pmv-source-line';
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
    SOURCE_LINE_ATTRIBUTE,
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
markdown.core.ruler.push('pmv_source_line_anchors', (state) => {
    state.tokens.forEach((token) => {
        if (!token.map || !token.block || !token.tag || !isAnchorableToken(token.type, token.nesting)) {
            return;
        }
        token.attrSet(SOURCE_LINE_ATTRIBUTE, String(token.map[0]));
    });
});
const defaultFenceRenderer = markdown.renderer.rules.fence;
const defaultCodeBlockRenderer = markdown.renderer.rules.code_block;
const defaultHtmlBlockRenderer = markdown.renderer.rules.html_block;
markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
    const rendered = defaultFenceRenderer
        ? defaultFenceRenderer(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    return addSourceLineToPre(rendered, tokens[index].map?.[0]);
};
markdown.renderer.rules.code_block = (tokens, index, options, env, self) => {
    const rendered = defaultCodeBlockRenderer
        ? defaultCodeBlockRenderer(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    return addSourceLineToPre(rendered, tokens[index].map?.[0]);
};
markdown.renderer.rules.html_block = (tokens, index, options, env, self) => {
    const rendered = defaultHtmlBlockRenderer
        ? defaultHtmlBlockRenderer(tokens, index, options, env, self)
        : tokens[index].content;
    return `${buildSourceLineMarker(tokens[index].map?.[0])}${rendered}`;
};
function renderMarkdown(source) {
    return sanitizeHtml(markdown.render(source));
}
function isAnchorableToken(type, nesting) {
    if (type === 'html_block' || type === 'fence' || type === 'code_block') {
        return false;
    }
    return nesting === 1 || nesting === 0;
}
function addSourceLineToPre(html, sourceLine) {
    if (sourceLine === undefined) {
        return html;
    }
    return html.replace(/<pre(?=[\s>])/i, `<pre ${SOURCE_LINE_ATTRIBUTE}="${sourceLine}"`);
}
function buildSourceLineMarker(sourceLine) {
    if (sourceLine === undefined) {
        return '';
    }
    return `<span ${SOURCE_LINE_ATTRIBUTE}="${sourceLine}"></span>`;
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
        if (attributeName === SOURCE_LINE_ATTRIBUTE && !/^\d+$/.test(attributeValue)) {
            continue;
        }
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