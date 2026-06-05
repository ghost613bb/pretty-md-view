import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

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

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code: string, language: string): string {
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre><code class="hljs language-${escapeHtml(language)}">${hljs.highlight(code, {
          language,
          ignoreIllegals: true
        }).value}</code></pre>`;
      } catch {
        return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
      }
    }

    return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
  }
})
  .enable('table')
  .use(markdownItTaskLists, { enabled: false, label: true, labelAfter: true });

export function renderMarkdown(source: string): string {
  return sanitizeHtml(markdown.render(source));
}

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?([a-z][a-z0-9-]*)(\s[^<>]*)?>/gi, (match, tagName: string, attributes = '') => {
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

function sanitizeAttributes(attributes: string): string {
  const sanitized: string[] = [];
  const attributePattern = /\s+([^\s=\"'<>`]+)(?:\s*=\s*(\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>`]+)))?/g;
  let attributeMatch: RegExpExecArray | null;

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

function isSafeUri(value: string): boolean {
  return /^(?!\s*javascript:)(?!\s*vbscript:)/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
