# React Chapter Canvas

React components for previewing the final chapter XHTML files with the exact
styles used in the EPUB. Each component loads an XHTML file into an isolated
iframe and links the same CSS (`../styles/fonts.css`, `../styles/style.css`) so
the brushstroke badge, vertical title bar, stacked title words, drop cap,
quiz, worksheet and image quote render identically to the book.

## Components

- **`ChapterCanvasIframe.jsx`** – low‑level component that injects a chapter's
  XHTML into an iframe with the canonical CSS.
- **`ChapterIPreview.jsx`** – simple example loading Chapter I.
- **`AllChaptersPreview.jsx`** – dropdown to preview any chapter.

To use, import the desired component into your React app and ensure the project
serves the repository's `OEBPS` directory so relative paths resolve correctly.
