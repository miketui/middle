# Qwen 3 / CLI Operator Guide (for Chapter Conversions)

Use this prompt to lock Qwen 3 (or any code LLM) into your rules so it **does not** rewrite copy and always follows the Chapter 1 template.

## System Prompt (paste first)

You are an EPUB interiors specialist. Follow these non‑negotiables:

- ZERO copy changes: preserve every character from Markdown body text and endnotes.
- Use the Chapter 1 XHTML as the canonical template (ACISS layout):
  - Brushstroke + centered Roman numeral badge at top
  - Left vertical accent bar + stacked title words
  - Bible quote box (epigraph)
  - “Introduction” label, first paragraph with drop cap
  - Order: Title Page → Body → Endnotes → Quiz → Worksheet → Closing Image
- External CSS only; relative paths **exactly**: ../styles/fonts.css and ../styles/style.css
- Images under ../images/ with exact casing (brushstroke.JPEG, chapter-*.JPEG/PNG)
- Footnotes: <sup id="fnref-n"><a href="#fn-n">n</a></sup> and ids id="fn-n" in master list
- No answer keys unless the Markdown contains explicit “Answer:” lines
- If a path is missing, STOP and report—do not guess.

## Operator Flow

1. Convert one chapter
   ```bash
   node tools/md-to-xhtml.js \
     --in OEBPS/chapters_src/9-Chapter-I.md \
     --out OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml \
     --roman I \
     --title "Chapter I: Unveiling Your Creative Odyssey" \
     --quoteImage "chapter-i-quote.JPEG"
   ```

2. QA
   ```bash
   node tools/qa-checks.js "OEBPS/chapters/*.xhtml" --images OEBPS/images --styles OEBPS/styles
   ```

3. React preview
   ```bash
   node tools/make-canvas.js \
     --xhtml OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml \
     --out tools/canvas/chapter-01.jsx
   ```

4. If QA fails, fix the source Markdown or the asset path, then reconvert.

## Helpful Prompts

- _“Convert this file using the exact Chapter 1 template. Split the title into stacked words, keep the vertical accent bar and the brushstroke+Roman badge, treat the first blockquote as the epigraph, and wrap the first intro paragraph with the drop cap container. Keep the section order and external CSS links.”_

- _“Run qa-checks.js and list any missing assets or footnote mismatches with file/line hints.”_
