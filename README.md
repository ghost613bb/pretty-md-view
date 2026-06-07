# Pretty Markdown Preview

## 中文说明

Pretty Markdown Preview 是一个轻量的 VS Code Markdown 美化预览插件。

它不会替换 VS Code 自带的 Markdown 编辑器，也不会接管默认预览。你仍然在左侧用普通 Markdown 文件写内容，插件会在右侧打开一个独立的 Webview 预览面板，让文档看起来更清爽、更适合阅读。

适合用来预览：

- README
- 技术文档
- 开发笔记
- 本地 Markdown 草稿

### 效果展示

下面左侧是 Markdown 源文件，右侧是 Pretty Markdown Preview 渲染后的预览效果。

<table>
  <tr>
    <td width="50%" align="center"><strong>Markdown 源文件</strong></td>
    <td width="50%" align="center"><strong>预览效果</strong></td>
  </tr>
  <tr>
    <td width="50%"><img src="./docs/images/showcase-markdown.png" alt="Markdown source screenshot"></td>
    <td width="50%"><img src="./docs/images/showcase-preview.png" alt="Pretty Markdown Preview screenshot"></td>
  </tr>
</table>

### 支持范围

当前版本仅支持 **VS Code 内的本地 Markdown 美化预览**，具体能力如下：

- 在当前编辑器旁边打开独立 Webview 预览面板。
- 不替换 VS Code 自带 Markdown 编辑器，也不接管默认 Markdown 预览。
- 支持通过命令面板执行 `Pretty Markdown Preview: Open Preview` 打开预览。
- 支持在 Markdown 编辑器右键菜单中打开预览。
- 支持编辑 Markdown 后自动刷新当前预览。
- 支持基于源码行锚点的编辑区到预览区同步滚动。
- 支持标题、段落、分隔线、加粗、斜体、删除线和行内代码。
- 支持有序列表、无序列表、嵌套列表和任务列表。
- 支持引用块、链接、图片和代码块。
- 支持 Markdown 管道表格。
- 支持安全白名单内的原生 HTML 标签，例如 `table`、`tr`、`td`、`th`、`img`、`a`、`strong`、`span` 等。
- 支持原生 HTML 表格中嵌入图片。
- 支持使用 `highlight.js` 高亮已识别语言的围栏代码块。
- 支持当前 Markdown 文件目录下的本地相对路径图片，例如 `./assets/a.png`。
- 支持远程 `http` / `https` 图片和 `data:` 图片。
- 支持点击预览中的图片进行放大查看。

### 不支持范围

当前版本不支持以下能力：

- 不支持 Mermaid 图表渲染。
- 不支持数学公式渲染，例如 LaTeX、KaTeX、MathJax。
- 不支持 PlantUML、Graphviz 等图形 DSL 渲染。
- 不支持导出 HTML、PDF 或图片。
- 不支持主题切换、字体配置、字号配置或自定义 CSS。
- 不支持在预览中直接编辑 Markdown，也不是 Typora 式所见即所得编辑器。
- 不支持替换或增强 VS Code 默认 Markdown Preview。
- 不支持跨文件目录之外的本地资源访问，例如引用当前 Markdown 文件所在目录之外的图片。
- 不支持执行任意 HTML、JavaScript 或内联事件。
- 不支持 `script`、`iframe`、`style` 等高风险 HTML 标签。
- 不支持 HTML 的 `style` 属性和 `onerror`、`onclick` 等事件属性。
- 不支持插件市场发布、自动更新或在线同步配置；当前主要面向本地 `.vsix` 安装和本地开发。

### 安装使用

如果你已经有打包好的 `.vsix` 文件，可以直接安装：

```bash
code --install-extension pretty-md-view-0.0.1.vsix
```

也可以在 VS Code 里安装：

1. 打开 VS Code。
2. 按 `Cmd + Shift + P`。
3. 输入 `Extensions: Install from VSIX...`。
4. 选择 `pretty-md-view-0.0.1.vsix`。

### 使用方式

1. 在 VS Code 中打开一个 `.md` 文件。
2. 按 `Cmd + Shift + P` 打开命令面板。
3. 输入并执行 `Pretty Markdown Preview: Open Preview`。
4. 右侧会打开美化后的 Markdown 预览。

你也可以在 Markdown 编辑器里右键，选择 `Pretty Markdown Preview: Open Preview`。

### 本地开发

安装依赖：

```bash
npm install
```

运行测试和编译：

```bash
npm test
npm run compile
```

在 VS Code 中调试插件：

1. 用 VS Code 打开本项目目录。
2. 进入 Run and Debug 面板。
3. 选择 `Run Extension`。
4. 启动后会打开 Extension Development Host 窗口。
5. 在新窗口中打开 `examples/sample.md`。
6. 执行 `Pretty Markdown Preview: Open Preview`。

### 打包插件

生成本地 VSIX 安装包：

```bash
npm run package
```

打包成功后会生成类似这样的文件：

```text
pretty-md-view-0.0.1.vsix
```

这个 `.vsix` 文件可以发给别人安装，也可以自己本地安装使用。


## English

Pretty Markdown Preview is a lightweight VS Code extension for a cleaner Markdown preview experience.

It does not replace VS Code's built-in Markdown editor or take over the default preview. You keep editing normal Markdown files, and the extension opens a separate Webview preview beside the editor.

It is useful for:

- README files
- Technical documentation
- Development notes
- Local Markdown drafts

### Preview

The left side shows the Markdown source file. The right side shows the rendered Pretty Markdown Preview output.

<table>
  <tr>
    <td width="50%" align="center"><strong>Markdown Source</strong></td>
    <td width="50%" align="center"><strong>Rendered Preview</strong></td>
  </tr>
  <tr>
    <td width="50%"><img src="./docs/images/showcase-markdown.png" alt="Markdown source screenshot"></td>
    <td width="50%"><img src="./docs/images/showcase-preview.png" alt="Pretty Markdown Preview screenshot"></td>
  </tr>
</table>

### Supported Scope

This version only supports **local Markdown preview inside VS Code**. It currently supports:

- Opening an independent Webview preview panel beside the current editor.
- Keeping VS Code's built-in Markdown editor and default Markdown preview unchanged.
- Opening the preview from the Command Palette with `Pretty Markdown Preview: Open Preview`.
- Opening the preview from the Markdown editor context menu.
- Automatically refreshing the current preview after Markdown edits.
- Supporting editor-to-preview synchronized scrolling based on source-line anchors.
- Rendering headings, paragraphs, horizontal rules, bold text, italic text, strikethrough, and inline code.
- Rendering ordered lists, unordered lists, nested lists, and task lists.
- Rendering blockquotes, links, images, and fenced code blocks.
- Rendering Markdown pipe tables.
- Rendering allowlisted raw HTML tags, such as `table`, `tr`, `td`, `th`, `img`, `a`, `strong`, and `span`.
- Rendering images inside raw HTML tables.
- Highlighting recognized fenced code block languages with `highlight.js`.
- Loading local relative images under the current Markdown file directory, such as `./assets/a.png`.
- Loading remote `http` / `https` images and `data:` images.
- Clicking preview images to open a larger overlay preview.

### Unsupported Scope

This version does not support:

- Mermaid diagram rendering.
- Math rendering, such as LaTeX, KaTeX, or MathJax.
- PlantUML, Graphviz, or other diagram DSL rendering.
- HTML, PDF, or image export.
- Theme switching, font configuration, font-size configuration, or custom CSS.
- Editing Markdown directly inside the preview; this is not a Typora-style WYSIWYG editor.
- Replacing or enhancing VS Code's built-in Markdown Preview.
- Accessing local resources outside the current Markdown file directory, such as images in unrelated folders.
- Executing arbitrary HTML, JavaScript, or inline event handlers.
- High-risk HTML tags such as `script`, `iframe`, or `style`.
- HTML `style` attributes or event attributes such as `onerror` and `onclick`.
- Marketplace publishing, automatic updates, or online configuration sync; this project is currently mainly for local `.vsix` installation and local development.

### Install

If you already have the packaged `.vsix` file, install it with:

```bash
code --install-extension pretty-md-view-0.0.1.vsix
```

You can also install it from VS Code:

1. Open VS Code.
2. Press `Cmd + Shift + P`.
3. Run `Extensions: Install from VSIX...`.
4. Select `pretty-md-view-0.0.1.vsix`.

### Usage

1. Open a `.md` file in VS Code.
2. Open the Command Palette with `Cmd + Shift + P`.
3. Run `Pretty Markdown Preview: Open Preview`.
4. A prettier Markdown preview opens beside the editor.

You can also right-click inside a Markdown editor and choose `Pretty Markdown Preview: Open Preview`.

### Local Development

Install dependencies:

```bash
npm install
```

Run tests and compile:

```bash
npm test
npm run compile
```

Debug the extension in VS Code:

1. Open this project folder in VS Code.
2. Go to Run and Debug.
3. Select `Run Extension`.
4. VS Code opens an Extension Development Host window.
5. Open `examples/sample.md` in that new window.
6. Run `Pretty Markdown Preview: Open Preview`.

### Package

Build a local VSIX package:

```bash
npm run package
```

The command generates a file like:

```text
pretty-md-view-0.0.1.vsix
```

You can share this `.vsix` file with others or install it locally.

