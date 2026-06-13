import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

import markdownItTaskLists from 'markdown-it-task-lists';

const SOURCE_LINE_ATTRIBUTE = 'data-pmv-source-line';
const FALLBACK_HEADING_ID = 'section';

interface MarkdownTokenLike {
  type: string;
  tag: string;
  nesting: number;
  block: boolean;
  content: string;
  map?: [number, number] | null;
  children?: MarkdownTokenLike[];
  attrGet(name: string): string | null;
  attrSet(name: string, value: string): void;
}

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
  'id',
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

markdown.core.ruler.push('pmv_source_line_anchors', (state) => {
  state.tokens.forEach((token) => {
    if (!token.map || !token.block || !token.tag || !isAnchorableToken(token.type, token.nesting)) {
      return;
    }

    token.attrSet(SOURCE_LINE_ATTRIBUTE, String(token.map[0]));
  });
});

markdown.core.ruler.push('pmv_heading_ids', (state) => {
  const usedIds = collectExplicitIds(state.tokens as MarkdownTokenLike[]);

  state.tokens.forEach((token, index, tokens) => {
    const headingToken = token as MarkdownTokenLike;

    if (headingToken.type !== 'heading_open') {
      return;
    }

    const existingId = headingToken.attrGet('id');

    if (existingId) {
      usedIds.add(existingId);
      return;
    }

    const inlineToken = tokens[index + 1] as MarkdownTokenLike | undefined;

    if (!inlineToken || inlineToken.type !== 'inline') {
      return;
    }

    if (collectExplicitIds([inlineToken]).size > 0) {
      return;
    }

    const headingId = createUniqueHeadingId(slugifyHeadingText(extractTextContent(inlineToken)), usedIds);
    headingToken.attrSet('id', headingId);
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

export function renderMarkdown(source: string): string {
  return sanitizeHtml(markdown.render(source));
}

function isAnchorableToken(type: string, nesting: number): boolean {
  if (type === 'html_block' || type === 'fence' || type === 'code_block') {
    return false;
  }

  return nesting === 1 || nesting === 0;
}

function addSourceLineToPre(html: string, sourceLine: number | undefined): string {
  if (sourceLine === undefined) {
    return html;
  }

  return html.replace(/<pre(?=[\s>])/i, `<pre ${SOURCE_LINE_ATTRIBUTE}="${sourceLine}"`);
}

function buildSourceLineMarker(sourceLine: number | undefined): string {
  if (sourceLine === undefined) {
    return '';
  }

  return `<span ${SOURCE_LINE_ATTRIBUTE}="${sourceLine}"></span>`;
}

function collectExplicitIds(tokens: MarkdownTokenLike[]): Set<string> {
  const ids = new Set<string>();

  const visitToken = (token: MarkdownTokenLike) => {
    const tokenId = token.attrGet('id');

    if (tokenId) {
      ids.add(tokenId);
    }

    if (token.type === 'html_block' || token.type === 'html_inline') {
      extractHtmlIds(token.content).forEach((id) => ids.add(id));
    }

    token.children?.forEach(visitToken);
  };

  tokens.forEach(visitToken);
  return ids;
}

function extractHtmlIds(html: string): string[] {
  const ids: string[] = [];
  const attributePattern = /\sid\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(html)) !== null) {
    const id = (match[2] ?? match[3] ?? match[4] ?? '').trim();

    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

function extractTextContent(token: MarkdownTokenLike): string {
  if (token.type === 'softbreak' || token.type === 'hardbreak') {
    return ' ';
  }

  if (token.type === 'html_inline' || token.type === 'html_block') {
    return stripHtmlTags(token.content);
  }

  if (!token.children || token.children.length === 0) {
    return token.content;
  }

  return token.children.map((child) => extractTextContent(child)).join('');
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

function slugifyHeadingText(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');

  const slug = normalizedValue
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || FALLBACK_HEADING_ID;
}

function createUniqueHeadingId(baseId: string, usedIds: Set<string>): string {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 1;
  let nextId = `${baseId}-${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  usedIds.add(nextId);
  return nextId;
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
