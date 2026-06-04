import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

const markdown = new MarkdownIt({
  html: false,
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
  return markdown.render(source);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
