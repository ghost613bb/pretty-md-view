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

  it('renders raw html table tags', () => {
    const html = renderMarkdown('<table>\n<tr>\n<td width="50%" align="center"><strong>A</strong></td>\n</tr>\n</table>');

    expect(html).toContain('<table>');
    expect(html).toContain('<td width="50%" align="center"><strong>A</strong></td>');
  });

  it('renders images inside raw html tables', () => {
    const html = renderMarkdown('<table>\n<tr>\n<td width="50%"><img src="./demo.png" alt="Demo image"></td>\n</tr>\n</table>');

    expect(html).toContain('<table>');
    expect(html).toContain('<td width="50%"><img src="./demo.png" alt="Demo image"></td>');
  });

  it('removes unsafe attributes from raw html', () => {
    const html = renderMarkdown('<img src="./demo.png" onerror="alert(1)" style="width: 100px">');

    expect(html).toContain('<img src="./demo.png">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('style=');
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

  it('does not keep unsafe javascript links in raw html', () => {
    const html = renderMarkdown('<a href="javascript:alert(1)">bad</a>');

    expect(html).toContain('<a>bad</a>');
    expect(html).not.toContain('javascript:');
  });
});
