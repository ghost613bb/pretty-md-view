"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExternalUri = isExternalUri;
exports.isLocalRelativeUri = isLocalRelativeUri;
exports.rewriteMarkdownImageSources = rewriteMarkdownImageSources;
const EXTERNAL_URI_PATTERN = /^(https?:)?\/\//i;
const DATA_URI_PATTERN = /^data:/i;
const ANCHOR_PATTERN = /^#/;
const ABSOLUTE_PATH_PATTERN = /^\//;
function isExternalUri(uri) {
    return EXTERNAL_URI_PATTERN.test(uri);
}
function isLocalRelativeUri(uri) {
    if (!uri) {
        return false;
    }
    if (isExternalUri(uri) ||
        DATA_URI_PATTERN.test(uri) ||
        ANCHOR_PATTERN.test(uri) ||
        ABSOLUTE_PATH_PATTERN.test(uri)) {
        return false;
    }
    return true;
}
function rewriteMarkdownImageSources(html, rewrite) {
    return html.replace(/<img\b([^>]*?)\bsrc="([^"]+)"([^>]*)>/gi, (match, before, src, after) => {
        if (!isLocalRelativeUri(src)) {
            return match;
        }
        return `<img${before}src="${rewrite(src)}"${after}>`;
    });
}
//# sourceMappingURL=assetResolver.js.map