#!/usr/bin/env node
/**
 * md-to-xhtml.js
 * Minimal, safe Markdown → EPUB-ready XHTML converter using the Chapter 1 template.
 * 
 * USAGE:
 *   node tools/md-to-xhtml.js \
 *     --in OEBPS/chapters_src/9-Chapter-I.md \
 *     --out OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml \
 *     --roman I \
 *     --title "Unveiling Your Creative Odyssey" \
 *     --quote "I’m always doing things in a metaphorical way… I wanted to get across the idea of hair in motion to represent change—getting out of dark times and leaving uncertainty behind. — Jawara W" \
 *     --quoteImage "chapter-i-quote.JPEG"
 * 
 * Dependencies (install once in repo root):
 *   npm i markdown-it markdown-it-footnote js-yaml jsdom he fast-glob
 * 
 * Notes:
 * - ZERO copy changes: we do not rewrite prose.
 * - We lift: epigraph (first top-level blockquote), intro (first 3–4 paragraphs), body, quiz, worksheet, endnotes, closing image.
 * - Asset paths are external and relative: ../styles/*.css and ../images/*.
 * - If a required asset is missing, we STOP with a non-zero exit code.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { JSDOM } = require('jsdom');
const he = require('he');
const fg = require('fast-glob');
const MarkdownIt = require('markdown-it');
const mdFootnote = require('markdown-it-footnote');

// ---------- helpers ----------
function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function die(msg) { console.error('ERROR:', msg); process.exit(1); }
function escAttr(s) { return he.encode(String(s ?? ''), { useNamedReferences: true }); }
function splitFrontMatter(src) {
  if (!src.startsWith('---')) return { fm: null, body: src };
  const end = src.indexOf('\n---', 3);
  if (end === -1) return { fm: null, body: src };
  const fmRaw = src.slice(3, end).trim();
  const body = src.slice(end + 4).replace(/^\s*\n/, '');
  let fm;
  try { fm = yaml.load(fmRaw) || {}; } catch (e) { die('Invalid YAML front-matter: ' + e.message); }
  return { fm, body };
}

function getEpigraph(lines) {
  // First contiguous block of lines starting with '>' near top
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('>')) { start = i; break; }
    if (lines[i].trim() && !lines[i].startsWith('#')) break; // past headers/blank lines
  }
  if (start === -1) return { epigraph: null, afterIndex: 0 };
  end = start;
  while (end < lines.length && (lines[end].startsWith('>') || lines[end].trim()==='')) end++;
  const block = lines.slice(start, end).join('\n');
  return { epigraph: block, afterIndex: end };
}

function extractIntroParagraphs(mdBodyAfterEpigraph) {
  // We take paragraphs until the first '## ' heading
  const lines = mdBodyAfterEpigraph.split('\n');
  const introLines = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('## ')) break;
    introLines.push(lines[i]);
    i++;
  }
  const introSrc = introLines.join('\n').trim();
  const restSrc = lines.slice(i).join('\n');
  return { introSrc, restSrc };
}

function splitSectionsOnHeadings(md) {
  // create a map of top-level sections by '## ' headings
  const sections = {};
  let current = '_BODY';
  sections[current] = [];
  const lines = md.split('\n');
  for (let i=0;i<lines.length;i++) {
    const L = lines[i];
    const m = /^##\s+(.*)$/.exec(L);
    if (m) {
      current = m[1].trim();
      sections[current] = [];
    } else {
      sections[current].push(L);
    }
  }
  const normalize = o => Object.fromEntries(Object.entries(o).map(([k,v])=>[k, v.join('\n').trim()]));
  return normalize(sections);
}

function ensureAssets(imagesRoot, needed) {
  const misses = [];
  for (const rel of needed) {
    if (!rel) continue;
    const full = path.join(imagesRoot, rel);
    if (!fs.existsSync(full)) misses.push(rel);
  }
  if (misses.length) die(`Missing image assets: ${misses.join(', ')}`);
}

function titleStackFrom(title) {
  // Remove leading "Chapter X:" if present, split by spaces
  if (!title) return [];
  const colon = title.indexOf(':');
  const raw = colon !== -1 ? title.slice(colon+1) : title;
  return raw.trim().split(/\s+/).filter(Boolean);
}

function mdToHtml(mdSrc) {
  const md = MarkdownIt({ html: false, linkify: true, typographer: true }).use(mdFootnote);
  return md.render(mdSrc || '');
}

// ---------- CLI args ----------
const args = Object.fromEntries(process.argv.slice(2).map((v,i,arr)=>{
  if (!v.startsWith('--')) return [];
  const key = v.slice(2);
  const val = (arr[i+1] && !arr[i+1].startsWith('--')) ? arr[i+1] : true;
  return [key, val];
}).filter(x=>x.length));

const inFile = args['in'];
const outFile = args['out'];
if (!inFile || !outFile) die('Usage: node md-to-xhtml.js --in <md> --out <xhtml> [--roman I] [--title "…"] [--quoteImage "chapter-i-quote.JPEG"] [--quote "alt/caption text"]');

const repoRoot = process.cwd();
const imagesRoot = path.join(repoRoot, 'OEBPS', 'images');
const stylesRoot = path.join(repoRoot, 'OEBPS', 'styles');

// ---------- read & parse markdown ----------
const raw = readFile(inFile);
const { fm, body } = splitFrontMatter(raw);

// Title / Roman
const roman = String(args['roman'] || (fm && fm.chapter_number) || '').trim() || die('Missing --roman and YAML chapter_number');
const fullTitle = String(args['title'] || (fm && fm.title) || '').replace(/^Chapter\s+[IVXLCDM]+\s*:\s*/i,'').trim() || die('Missing --title or YAML title');
const titleWords = titleStackFrom(args['title'] || (fm && fm.title));

// Epigraph: take first top-level blockquote in doc
const lines = body.split('\n');
const { epigraph, afterIndex } = getEpigraph(lines);
if (!epigraph) die('No epigraph (blockquote) found; Chapter 1 requires it.');
const epigraphText = epigraph.replace(/^>\s?/mg,'').trim();
const epiParts = epigraphText.split('\n').map(s=>s.trim()).filter(Boolean);
const epiQuote = epiParts.slice(0, epiParts.length-1).join(' ');
const epiRef = epiParts[epiParts.length-1].replace(/^—\s*/, '');

// Introduction: paragraphs before first "## "
const afterEpigraphMd = lines.slice(afterIndex).join('\n');
const { introSrc, restSrc } = extractIntroParagraphs(afterEpigraphMd);
if (!introSrc.trim()) die('Could not extract Introduction block (paragraphs before first "## ").');

// Split remaining sections
const sections = splitSectionsOnHeadings(restSrc);

// Optional: specific sections by name (case-insensitive lookup)
function pick(name) {
  for (const k of Object.keys(sections)) {
    if (k.toLowerCase().trim() === name.toLowerCase().trim()) return sections[k];
  }
  return '';
}

// Closing image from YAML or CLI; normalize to JPEG unless PNG given
let quoteImage = args['quoteImage'] || (fm && fm.image_quote) || '';
quoteImage = quoteImage.replace(/^(\.\.\/)?assets\/images\//, '').replace(/^(\.\.\/)?images\//, '');
if (quoteImage.toLowerCase().endsWith('.png')) {
  // keep PNG if author specified
} else {
  quoteImage = quoteImage.replace(/\.(jpeg|jpg|png)$/i, '.JPEG');
}
const neededImages = ['brushstroke.JPEG', quoteImage].filter(Boolean);
ensureAssets(imagesRoot, neededImages);

// Build HTML blocks
const introHTML = mdToHtml(introSrc)
  .replace(/^<p>/, '<p>') // first paragraph will get drop-cap via wrapper
;
const bodyHTML = mdToHtml(sections['_BODY']);

const quizHTMLMd = pick('Quiz');
const worksheetHTMLMd = pick('Worksheet');
const endnotesHTMLMd = pick('Endnotes') || pick('Notes') || '';

// Convert specific blocks with wrappers
function makeQuiz(htmlMd) {
  if (!htmlMd.trim()) return '';
  const inner = mdToHtml(htmlMd);
  return `
<section class="quiz-container chap-quiz avoid-break" role="region" aria-labelledby="quiz-title">
  <h2 id="quiz-title" class="quiz-title">Quiz</h2>
  ${inner}
</section>`.trim();
}

function makeWorksheet(htmlMd) {
  if (!htmlMd.trim()) return '';
  const inner = mdToHtml(htmlMd);
  return `
<section class="worksheet avoid-break" role="region" aria-labelledby="ws-title">
  <h2 id="ws-title" class="worksheet-title">Worksheet</h2>
  ${inner}
</section>`.trim();
}

function makeEndnotesAside(htmlMd) {
  if (!htmlMd.trim()) return '';
  const inner = mdToHtml(htmlMd);
  return `
<aside class="endnotes" role="doc-endnotes">
  ${inner}
</aside>`.trim();
}

// Footnotes master (from markdown-it-footnote)
function extractFootnotesMaster(mdSrc) {
  // markdown-it-footnote renders a <section class="footnotes"> at the end.
  // We'll render the whole doc and then pluck that section.
  const rendered = mdToHtml(mdSrc);
  const dom = new JSDOM(rendered);
  const sec = dom.window.document.querySelector('section.footnotes');
  return sec ? sec.outerHTML.replace('<section class="footnotes">', '<section class="footnotes footnotes-end-of-document" role="doc-endnotes">') : '';
}
const footnotesMaster = extractFootnotesMaster(raw);

// Assemble XHTML
const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Chapter ${escAttr(roman)} — ${escAttr(fullTitle)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" type="text/css" href="../styles/fonts.css" />
    <link rel="stylesheet" type="text/css" href="../styles/style.css" />
  </head>
  <body class="chap-title">
    <section class="chap-title" role="doc-part">
      <div class="chapter-number-container" aria-label="Chapter number">
        <div class="chapter-number-brush">
          <img class="brushstroke-img" src="../images/brushstroke.JPEG" alt="" />
          <div class="chapter-number-text">${escAttr(roman)}</div>
        </div>
      </div>
      <div class="chapter-title-container">
        <div class="chapter-title-stack">
          <div class="chapter-title-vertical" aria-hidden="true"></div>
          <div>
            ${titleWords.map(w=>`<h1 class="chapter-title chapter-title-word">${escAttr(w)}</h1>`).join('\n            ')}
          </div>
        </div>
      </div>
      <figure class="bible-quote-container image-quote" role="group" aria-labelledby="bq-text bq-ref">
        <blockquote class="bible-quote-text" id="bq-text">
          ${escAttr(epiQuote)}
        </blockquote>
        <figcaption class="bible-quote-reference" id="bq-ref">— ${escAttr(epiRef)}</figcaption>
      </figure>
      <div class="introduction-heading" role="heading" aria-level="2">Introduction</div>
      <div class="introduction-paragraph dropcap-first-letter">
        ${introHTML}
      </div>
    </section>
    <section class="chap-body" role="doc-chapter">
      <div class="content-area">
${bodyHTML}
      </div>
      ${makeEndnotesAside(endnotesHTMLMd)}
      ${makeQuiz(quizHTMLMd)}
      ${makeWorksheet(worksheetHTMLMd)}
      <section class="image-quote" role="group" aria-labelledby="closing-caption">
        <figure>
          <img src="../images/${escAttr(quoteImage)}" alt="Chapter closing inspirational quote image." />
          <figcaption id="closing-caption" class="font-small color-light"></figcaption>
        </figure>
      </section>
      ${footnotesMaster}
    </section>
  </body>
</html>
`;

// Verify CSS exist
for (const css of ['fonts.css','style.css']) {
  if (!fs.existsSync(path.join(stylesRoot, css))) {
    console.warn('[WARN] CSS not found at OEBPS/styles/' + css + ' (ensure final EPUB has it).');
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, xhtml, 'utf8');
console.log('Wrote', outFile);
