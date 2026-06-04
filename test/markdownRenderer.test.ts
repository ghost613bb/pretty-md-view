import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/markdownRenderer';

describe('renderMarkdown', () => {
  it('renders headings and paragraphs', () => {
    const html = renderMarkdown('# Title\n\nHello **world**.');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>world</strong>');
  });

  it('renders task lists', () => {
    const html = renderMarkdown('- [x] done\n- [ ] todo');

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
  });

  it('renders tables', () => {
    const html = renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');

    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('highlights known code languages', () => {
    const html = renderMarkdown('```ts\nconst value = 1;\n```');

    expect(html).toContain('hljs');
    expect(html).toContain('const');
  });

  it('does not throw for unknown code languages', () => {
    expect(() => renderMarkdown('```unknown-language\nhello\n```')).not.toThrow();
  });

  it('does not render raw script tags as executable html', () => {
    const html = renderMarkdown('<script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
