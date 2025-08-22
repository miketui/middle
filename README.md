# Chapter Conversion Tooling

This repository provides Node-based scripts to turn Markdown chapters into EPUB-ready XHTML and lightweight HTML canvases for preview.

> These tools focus on chapter internals only; front and back matter are not yet included.

## Setup

```bash
npm install
```

## Convert all chapters

```bash
npm run convert:chapters   # outputs .xhtml to OEBPS/complete/
```

## Generate canvas previews

```bash
npm run make:canvases      # outputs *_canvas.html to OEBPS/react/
```

Open any file in `OEBPS/react/` in a browser or local static server to preview the rendered chapter with the project's shared CSS.
