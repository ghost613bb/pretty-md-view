const EXTERNAL_URI_PATTERN = /^(https?:)?\/\//i;
const DATA_URI_PATTERN = /^data:/i;
const ANCHOR_PATTERN = /^#/;
const ABSOLUTE_PATH_PATTERN = /^\//;

export function isExternalUri(uri: string): boolean {
  return EXTERNAL_URI_PATTERN.test(uri);
}

export function isLocalRelativeUri(uri: string): boolean {
  if (!uri) {
    return false;
  }

  if (
    isExternalUri(uri) ||
    DATA_URI_PATTERN.test(uri) ||
    ANCHOR_PATTERN.test(uri) ||
    ABSOLUTE_PATH_PATTERN.test(uri)
  ) {
    return false;
  }

  return true;
}

export function rewriteMarkdownImageSources(
  html: string,
  rewrite: (src: string) => string
): string {
  return html.replace(/<img\b([^>]*?)\bsrc="([^"]+)"([^>]*)>/gi, (match, before, src, after) => {
    if (!isLocalRelativeUri(src)) {
      return match;
    }

    return `<img${before}src="${rewrite(src)}"${after}>`;
  });
}
