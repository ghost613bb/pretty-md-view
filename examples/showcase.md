# Pretty Markdown Preview Showcase

> A clean local Markdown preview for README files, technical docs, and development notes.

This document is designed for screenshots. It shows the Markdown types currently supported by **Pretty Markdown Preview** in one compact page.

[Visit VS Code](https://code.visualstudio.com/) · [Jump to Code](#code-blocks)

---

## Text Formatting

Markdown can include **bold text**, *italic text*, ~~deleted text~~, `inline code`, and normal paragraphs with comfortable spacing.

Use it for release notes, architecture notes, onboarding docs, or daily engineering journals.

## Lists

### Task List

- [x] Render Markdown locally
- [x] Highlight code blocks
- [x] Preview local images
- [ ] Add more advanced features later

### Nested List

- Documentation
  - README
  - Design notes
  - API references
- Engineering notes
  - Debug steps
  - Deployment checklist
  - Investigation logs

## Blockquote

> Good documentation should feel easy to scan, calm to read, and close to the code it explains.

## Table

| Feature | Status | Notes |
| --- | --- | --- |
| Headings and paragraphs | Supported | Clear hierarchy |
| Tables | Supported | Styled header row |
| Task lists | Supported | Checkbox rendering |
| Code highlighting | Supported | Powered by `highlight.js` |
| Local images | Supported | Relative paths work in Webview |

## Code Blocks

```ts
type PreviewState = {
  fileName: string;
  isDirty: boolean;
  updatedAt: Date;
};

function renderPreview(markdown: string): string {
  return markdown.trim();
}
```

```bash
npm test
npm run compile
npm run package
```

## Local Image

The preview supports local relative images and click-to-preview image zoom.

![Pretty Markdown Preview card](./assets/markdown-preview-card.svg)

## Horizontal Rule

---

## What This Extension Focuses On

1. Keep editing in VS Code.
2. Open a prettier preview beside the editor.
3. Stay lightweight, local, and fast.
4. Make Markdown easier to read without changing your writing flow.
