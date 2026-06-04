import { describe, expect, it } from 'vitest';
import { isExternalUri, isLocalRelativeUri, rewriteMarkdownImageSources } from '../src/assetResolver';

describe('assetResolver', () => {
  it('detects external uri', () => {
    expect(isExternalUri('https://example.com/a.png')).toBe(true);
    expect(isExternalUri('http://example.com/a.png')).toBe(true);
    expect(isExternalUri('//example.com/a.png')).toBe(true);
    expect(isExternalUri('./assets/a.png')).toBe(false);
  });

  it('detects local relative uri', () => {
    expect(isLocalRelativeUri('./assets/a.png')).toBe(true);
    expect(isLocalRelativeUri('../img/a.png')).toBe(true);
    expect(isLocalRelativeUri('assets/a.png')).toBe(true);
    expect(isLocalRelativeUri('/absolute/a.png')).toBe(false);
    expect(isLocalRelativeUri('https://example.com/a.png')).toBe(false);
    expect(isLocalRelativeUri('#heading')).toBe(false);
    expect(isLocalRelativeUri('data:image/png;base64,abc')).toBe(false);
  });

  it('rewrites markdown image src attributes', () => {
    const html = '<p><img src="./assets/a.png" alt="a"> <img src="https://example.com/b.png" alt="b"></p>';
    const rewritten = rewriteMarkdownImageSources(html, (src) => `webview://${src}`);

    expect(rewritten).toContain('src="webview://./assets/a.png"');
    expect(rewritten).toContain('src="https://example.com/b.png"');
  });

  it('leaves anchors, absolute paths, and data images untouched', () => {
    const html = [
      '<img src="#diagram" alt="anchor">',
      '<img src="/absolute/a.png" alt="absolute">',
      '<img src="data:image/png;base64,abc" alt="data">'
    ].join('');
    const rewritten = rewriteMarkdownImageSources(html, (src) => `webview://${src}`);

    expect(rewritten).toBe(html);
  });
});
