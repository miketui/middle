#!/usr/bin/env bash
# file: run/updates_setup.sh
set -euo pipefail

# -----------------------------
# Paths
# -----------------------------
ROOT="$(cd "$(dirname "$0")/.."; pwd)"
OEBPS="$ROOT/OEBPS"
TOOLS="$ROOT/tools"
CANVAS_DIR="$TOOLS/canvas"
CHAPS_SRC="$OEBPS/chapters_src"
CHAPS_OUT="$OEBPS/chapters"
STYLES="$OEBPS/styles"
IMAGES="$OEBPS/images"
FONTS="$OEBPS/fonts"
TEMPLATES="$TOOLS/templates"

echo "Project root: $ROOT"

# -----------------------------
# Ensure tree exists
# -----------------------------
mkdir -p "$CHAPS_SRC" "$CHAPS_OUT" "$STYLES" "$IMAGES" "$FONTS" "$TOOLS" "$CANVAS_DIR" "$TEMPLATES" "run"

# -----------------------------
# npm hygiene (handles 'idealTree already exists')
# -----------------------------
if command -v npm >/dev/null 2>&1; then
  echo "Cleaning npm state…"
  # kill any zombie npm install from previous runs
  pkill -f "node .*npm" || true
  rm -rf "$ROOT/node_modules" "$ROOT/package-lock.json" || true
  npm cache clean --force || true

  # quiet, deterministic defaults for CI/containers
  npm set fund false
  npm set audit false
  npm set progress false
  npm set logs-dir "$ROOT/.npm-logs"
fi

# -----------------------------
# Initialize package.json if missing
# -----------------------------
if [ ! -f "$ROOT/package.json" ]; then
  echo "Initializing package.json…"
  (cd "$ROOT" && npm init -y >/dev/null)
fi

# -----------------------------
# Pin scripts (JS tool names)
# -----------------------------
echo "Wiring npm scripts…"
npm pkg set scripts.convert="node tools/md-to-xhtml.js" >/dev/null
npm pkg set scripts.qa="node tools/qa-checks.js" >/dev/null
npm pkg set scripts.canvas="node tools/make-canvas.js" >/dev/null
# Optional (only if/when you add it):
npm pkg set scripts.opf="node tools/make-opf-and-toc.js" >/dev/null || true

# -----------------------------
# Install runtime deps (idempotent)
# -----------------------------
echo "Installing dependencies…"
cd "$ROOT"
# core libs your tools use + friendly CLI helpers
npm i --save --no-audit --no-fund \
  markdown-it markdown-it-footnote markdown-it-deflist \
  jsdom yaml commander fast-glob prettier >/dev/null 2>&1 || {
    echo "First attempt failed, retrying once with verbose logs…"
    npm i --save --no-audit --no-fund \
      markdown-it markdown-it-footnote markdown-it-deflist \
      jsdom yaml commander fast-glob prettier
  }

# -----------------------------
# Drop placeholders if tools are missing (won't overwrite yours)
# -----------------------------
touch "$TOOLS/md-to-xhtml.js" \
      "$TOOLS/qa-checks.js" \
      "$TOOLS/make-canvas.js" \
      "$TOOLS/make-opf-and-toc.js"

# -----------------------------
# Copy “golden” Chapter 1 XHTML to templates (if present)
# -----------------------------
GOLDEN_CANDIDATE="$(ls "$CHAPS_OUT"/9-Chapter-I-*.xhtml 2>/dev/null | head -n1 || true)"
GOLDEN_DST="$TEMPLATES/golden-chapter.xhtml"
if [ -n "${GOLDEN_CANDIDATE:-}" ]; then
  cp -f "$GOLDEN_CANDIDATE" "$GOLDEN_DST"
  echo "Golden chapter copied -> $GOLDEN_DST"
else
  echo "NOTE: Put your shipping Chapter 1 XHTML at: $CHAPS_OUT/9-Chapter-I-*.xhtml"
fi

# -----------------------------
# Guard: core assets should exist
# -----------------------------
MISSING=0
need() { [ -f "$1" ] || { echo "MISSING: $1"; MISSING=1; }; }

need "$STYLES/style.css"
need "$STYLES/fonts.css"
need "$IMAGES/brushstroke.JPEG"
need "$IMAGES/endnote-marker.PNG"      # used by .endnote::before
need "$IMAGES/chapter-i-quote.JPEG"    # closing image for Ch.1

if [ $MISSING -ne 0 ]; then
  echo "Some required assets are missing. Add them under /OEBPS and re-run."
  exit 1
fi

# -----------------------------
# Friendly summary
# -----------------------------
cat <<'TXT'

✅ Setup/Update complete.

Key locations:
- Markdown inputs:        /OEBPS/chapters_src/
- XHTML outputs:          /OEBPS/chapters/
- Golden reference:       /tools/templates/golden-chapter.xhtml
- CSS:                    /OEBPS/styles/
- Images:                 /OEBPS/images/
- Fonts:                  /OEBPS/fonts/

NPM scripts:
- npm run convert   # tools/md-to-xhtml.js  (single/all chapters)
- npm run qa        # tools/qa-checks.js    (structure & class checks)
- npm run canvas    # tools/make-canvas.js  (preview helper)
- npm run opf       # tools/make-opf-and-toc.js (if implemented)

TXT
