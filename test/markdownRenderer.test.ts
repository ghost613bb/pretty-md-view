import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/markdownRenderer';

describe('renderMarkdown', () => {
  it('renders headings and paragraphs with source line anchors', () => {
    const html = renderMarkdown('# Title\n\nHello **world**.');

    expect(html).toContain('<h1 data-pmv-source-line="0">Title</h1>');
    expect(html).toContain('<p data-pmv-source-line="2">Hello <strong>world</strong>.</p>');
  });

  it('renders task lists', () => {
    const html = renderMarkdown('- [x] done\n- [ ] todo');

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
    expect(html).toContain('data-pmv-source-line="0"');
  });

  it('renders tables', () => {
    const html = renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');

    expect(html).toContain('<table data-pmv-source-line="0">');
    expect(html).toContain('<td>1</td>');
  });

  it('renders raw html table tags with a source line marker', () => {
    const html = renderMarkdown('<table>\n<tr>\n<td width="50%" align="center"><strong>A</strong></td>\n</tr>\n</table>');

    expect(html).toContain('<span data-pmv-source-line="0"></span><table>');
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

  it('keeps only numeric source line attributes', () => {
    const html = renderMarkdown(
      '<p data-pmv-source-line="3" data-demo="x">safe</p>\n<p data-pmv-source-line="bad">bad</p>'
    );

    expect(html).toContain('<p data-pmv-source-line="3">safe</p>');
    expect(html).toContain('<p>bad</p>');
    expect(html).not.toContain('data-demo');
    expect(html).not.toContain('data-pmv-source-line="bad"');
  });

  it('highlights known code languages with a source line anchor', () => {
    const html = renderMarkdown('```ts\nconst value = 1;\n```');

    expect(html).toContain('<pre data-pmv-source-line="0"><code class="hljs language-ts">');
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
