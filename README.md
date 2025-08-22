# Chapter Conversion Tooling (Chapters only – no compile)

This repo contains starter scripts to convert your Markdown chapter files into **Chapter 1–styled EPUB-ready XHTML** and to preview them in a React canvas.

> You are **not** compiling the full EPUB yet (front/back matter pending). These tools only touch chapter internals.

## Install

```bash
npm init -y
npm i markdown-it markdown-it-footnote js-yaml jsdom he fast-glob
```

## Layout (chapters only)

```
/OEBPS
  /chapters_src/          # your Markdown inputs (.md with YAML)
  /chapters/              # generated .xhtml
  /styles/                # fonts.css, style.css
  /images/                # brushstroke.JPEG, chapter-*.JPEG/PNG, etc.
  book-map.yaml
  project-structure.yaml
/tools
  md-to-xhtml.js
  qa-checks.js
  make-canvas.js
```

## Convert one chapter

```bash
node tools/md-to-xhtml.js \
  --in OEBPS/chapters_src/9-Chapter-I.md \
  --out OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml \
  --roman I \
  --title "Chapter I: Unveiling Your Creative Odyssey" \
  --quoteImage "chapter-i-quote.JPEG"
```

## QA the XHTML

```bash
node tools/qa-checks.js "OEBPS/chapters/*.xhtml" --images OEBPS/images --styles OEBPS/styles
```

## Make a React canvas preview

```bash
node tools/make-canvas.js \
  --xhtml OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml \
  --out tools/canvas/chapter-01.jsx
```

Open the JSX in your dev app and render it to see the chapter with external CSS applied (via an iframe).
