#!/usr/bin/env node
/**
 * qa-checks.js
 * Validates XHTML chapters against Chapter 1 rules.
 * 
 * USAGE:
 *   node tools/qa-checks.js OEBPS/chapters/*.xhtml --images OEBPS/images --styles OEBPS/styles
 * 
 * Dependencies:
 *   npm i jsdom fast-glob he
 */

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import fg from 'fast-glob';

const args = process.argv.slice(2);
const globs = args.filter(a => !a.startsWith('--'));
const imagesRoot = (args.find(a=>a.startsWith('--images')) || '').split('=')[1] || 'OEBPS/images';
const stylesRoot = (args.find(a=>a.startsWith('--styles')) || '').split('=')[1] || 'OEBPS/styles';

if (!globs.length) {
  console.error('Usage: node tools/qa-checks.js OEBPS/chapters/*.xhtml [--images OEBPS/images] [--styles OEBPS/styles]');
  process.exit(2);
}

function exists(p) { return fs.existsSync(p); }

function checkOne(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const d = dom.window.document;
  const issues = [];

  // Required CSS links
  const cssLinks = Array.from(d.querySelectorAll('link[rel="stylesheet"], link[rel="stylesheet"][type="text/css"], link[type="text/css"]'));
  const hrefs = cssLinks.map(l => l.getAttribute('href') || '');
  for (const req of ['../styles/fonts.css','../styles/style.css']) {
    if (!hrefs.includes(req)) issues.push(`Missing stylesheet link: ${req}`);
  }

  // Title page required elements
  if (!d.querySelector('.chapter-number-container .chapter-number-brush .brushstroke-img')) issues.push('Missing brushstroke image in title badge.');
  if (!d.querySelector('.chapter-number-container .chapter-number-brush .chapter-number-text')) issues.push('Missing Roman numeral in title badge.');
  if (!d.querySelector('.chapter-title-stack .chapter-title-vertical')) issues.push('Missing vertical accent bar near stacked title.');
  if (!d.querySelector('figure.bible-quote-container blockquote.bible-quote-text')) issues.push('Missing epigraph blockquote.');
  if (!d.querySelector('.introduction-paragraph.dropcap-first-letter p')) issues.push('Missing Introduction with dropcap-first-letter.');

  // Structure order
  const chapBody = d.querySelector('section.chap-body');
  if (!chapBody) issues.push('Missing <section class="chap-body">.');
  const orderWanted = ['.content-area', 'aside.endnotes', 'section.chap-quiz', 'section.worksheet', 'section.image-quote', 'section.footnotes-end-of-document'];
  const present = orderWanted.filter(sel => chapBody.querySelector(sel));
  // ensure .content-area exists
  if (!chapBody.querySelector('.content-area')) issues.push('Missing body <div class="content-area">.');
  // image-quote required
  if (!chapBody.querySelector('section.image-quote img')) issues.push('Missing closing image quote section with <img>.');

  // Footnotes: match refs and ids
  const refs = Array.from(d.querySelectorAll('sup[id^="fnref-"] a[href^="#fn-"]')).map(a => a.getAttribute('href').replace('#fn-',''));
  const footIds = Array.from(d.querySelectorAll('[id^="fn-"]')).map(n => (n.id || '').replace('fn-',''));
  const uniqRefs = new Set(refs);
  const uniqFoots = new Set(footIds);
  for (const r of uniqRefs) {
    if (!uniqFoots.has(r)) issues.push(`Footnote ref ${r} has no matching footnote id="fn-${r}".`);
  }

  // Assets exist
  const imgs = Array.from(d.querySelectorAll('img')).map(img => img.getAttribute('src') || '');
  imgs.forEach(rel => {
    if (!rel) return;
    let p = rel;
    if (p.startsWith('../images/')) p = p.replace('../images/', '');
    const abs = path.join(imagesRoot, p);
    if (!exists(abs)) issues.push(`Image not found on disk: ${rel} (looked in ${abs})`);
  });

  // Final
  return issues;
}

(async () => {
  const files = (await fg(globs)).sort();
  let bad = 0;
  for (const f of files) {
    const issues = checkOne(f);
    if (issues.length) {
      bad++;
      console.log('✗', f);
      for (const i of issues) console.log('  -', i);
    } else {
      console.log('✓', f);
    }
  }
  if (bad) {
    console.error(`\nQA FAIL: ${bad} file(s) with issues.`);
    process.exit(1);
  } else {
    console.log('\nQA PASS');
  }
})();
