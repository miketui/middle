#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import YAML from "yaml";

const ROOT = process.cwd();
const OEBPS = path.join(ROOT, "OEBPS");
const SRC_DIR = path.join(OEBPS, "chapters_src");
const OUT_DIR = path.join(OEBPS, "complete");
const TPL = path.join(ROOT, "tools", "templates", "chaptergolden.xhtml");
const BOOK_MAP = path.join(OEBPS, "book-map.yaml");
const IMAGES_DIR = path.join(OEBPS, "images");

await fsp.mkdir(OUT_DIR, { recursive: true });

// Load template
const template = await fsp.readFile(TPL, "utf8");

// Book-map (for chapter closing image, optional)
let imageHints = {};
if (fs.existsSync(BOOK_MAP)) {
  try {
    const y = YAML.parse(await fsp.readFile(BOOK_MAP, "utf8"));
    if (y?.images && typeof y.images === "object") imageHints = y.images;
  } catch {}
}

// Case-insensitive image resolver
async function findImageCI(name) {
  const want = name.toLowerCase();
  const files = await fsp.readdir(IMAGES_DIR);
  for (const f of files) {
    if (f.toLowerCase() === want) return f; // return actual casing
  }
  return name;
}

// Very small helpers
const esc = (s="") => s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const stripAnswers = (html) =>
  html.replace(/<p><strong>\s*Answer:\s*<\/strong>.*?<\/p>/gis, "");

// Convert inline footnote refs [^1] -> sup/anchor
function linkFootnoteRefs(html) {
  return html.replace(/\[\^(\d+)\]/g, (_, n) => `<sup id="fnref-${n}"><a href="#fn-${n}">${n}</a></sup>`);
}

// Pull footnote definitions
function extractFootnotes(md) {
  const notes = [];
  const re = /^\[\^(\d+)\]:\s*(.+)$/gm;
  let m;
  while ((m = re.exec(md))) notes.push({ n: m[1], text: m[2] });
  return notes;
}

function buildAsideEndnotes(notes) {
  if (!notes.length) return "";
  return [
    `<aside class="endnotes" role="doc-endnotes">`,
    `<h2 class="endnotes-title">Endnotes</h2>`,
    `<ol>`,
    ...notes.map(n => `<li id="fn-${n.n}" class="endnote">${esc(n.text)}</li>`),
    `</ol></aside>`
  ].join("\n");
}

function buildMasterEndnotes(notes) {
  if (!notes.length) return "";
  return [
    `<section class="footnotes footnotes-end-of-document" role="doc-endnotes">`,
    `<hr />`,
    `<ol>`,
    ...notes.map(n => `<li id="fn-${n.n}">${esc(n.text)} <a href="#fnref-${n.n}" class="footnote-back" role="doc-backlink">↩︎</a></li>`),
    `</ol></section>`
  ].join("\n");
}

// Grab epigraph + intro paragraphs from top of MD
function carveEpigraphAndIntro(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i].trim()==="" || lines[i].startsWith("#"))) i++;

  // epigraph
  const epi = [];
  while (i < lines.length && lines[i].trim().startsWith(">")) {
    epi.push(lines[i].replace(/^>\s?/, ""));
    i++;
  }
  let epigraphText = epi.join(" ").trim();
  let epigraphRef = "";
  const lastDash = epigraphText.lastIndexOf("—");
  if (lastDash > -1) {
    epigraphRef = epigraphText.slice(lastDash+1).trim();
    epigraphText = epigraphText.slice(0, lastDash).trim();
  }

  // intro until first "## "
  const introParas = [];
  let para = [];
  while (i < lines.length) {
    const L = lines[i];
    if (L.startsWith("## ")) break;
    if (L.trim()==="") {
      if (para.length) { introParas.push(para.join(" ").trim()); para = []; }
    } else {
      para.push(L.trim());
    }
    i++;
  }
  if (para.length) introParas.push(para.join(" ").trim());

  const rest = lines.slice(i).join("\n");
  return { epigraphText, epigraphRef, introParas, restAfterIntro: rest };
}

// Build quiz block (4 options, no answers)
function buildQuiz(md) {
  const m = md.match(/##\s*Quiz([\s\S]*?)(?=^\s*##\s*Worksheet|^\s*##\s*Image Quote|^\s*##\s*Endnotes|\Z)/im);
  if (!m) return "";
  const section = m[1].trim();

  const blocks = section.split(/^###\s*Question\s*\d+\s*$/im).slice(1);
  const out = [];
  out.push(`<section class="quiz-container chap-quiz avoid-break" role="region" aria-labelledby="quiz-title">`);
  out.push(`<h2 id="quiz-title" class="quiz-title">Quiz</h2>`);
  for (const qb of blocks) {
    const paras = qb.trim().split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (!paras.length) continue;
    out.push(`<h3>Question</h3>`);
    out.push(`<p>${marked.parseInline(paras[0])}</p>`);
    if (paras[1]) {
      const items = [];
      for (const line of paras[1].split(/\r?\n/)) {
        const m1 = line.match(/^\s*([a-dA-D])[\)\.\s]+(.+)$/);
        const m2 = line.match(/^\s*[-*]\s+(.+)$/);
        if (m1) items.push(m1[2]);
        else if (m2) items.push(m2[1]);
      }
      if (items.length) {
        out.push(`<ul class="quiz-options">`);
        items.slice(0,4).forEach((t, i) => out.push(`<li>${String.fromCharCode(97+i)}) ${marked.parseInline(t)}</li>`));
        out.push(`</ul>`);
      }
    }
  }
  out.push(`</section>`);
  return stripAnswers(out.join("\n"));
}

// Build worksheet block
function buildWorksheet(md) {
  const m = md.match(/##\s*Worksheet([\s\S]*?)(?=^\s*##\s*Image Quote|^\s*##\s*Endnotes|\Z)/im);
  if (!m) return "";
  const section = m[1].trim();
  const numbered = section.split(/^\s*\d+\.\s*/m).slice(1);
  const out = [];
  out.push(`<section class="worksheet avoid-break" role="region" aria-labelledby="ws-title">`);
  out.push(`<h2 id="ws-title" class="worksheet-title">Worksheet</h2>`);
  out.push(`<h3>Reflection and Implementation Exercises</h3>`);
  numbered.forEach((blk, idx) => {
    const first = blk.trim().split(/\r?\n/)[0] || "";
    out.push(`<div class="worksheet-section">`);
    out.push(`<p><strong>${idx+1}.</strong> ${marked.parseInline(first)}</p>`);
    out.push(`<div class="worksheet-input" style="min-height:4rem" aria-label="Worksheet input"></div>`);
    out.push(`<div class="worksheet-input" style="min-height:4rem" aria-label="Worksheet input"></div>`);
    out.push(`<div class="worksheet-input" style="min-height:4rem" aria-label="Worksheet input"></div>`);
    out.push(`</div>`);
  });
  out.push(`</section>`);
  return out.join("\n");
}

// Body MD -> HTML (after intro). Keep headings, lists, etc. Then fix image paths and footnote refs.
function bodyMdToHtml(md) {
  marked.setOptions({ mangle:false, headerIds:false });
  let html = marked.parse(md);
  html = linkFootnoteRefs(html);
  // fix images to ../images/<name>
  html = html.replace(/<img\s+[^>]*src="([^"]+)"/gi, (m, src) => {
    const file = path.posix.basename(src);
    return m.replace(src, `../images/${file}`);
  });
  return html.trim();
}

// Closing image by chapter roman (falls back to book-map’s key if present)
async function closingImageFor(roman) {
  const key = `chapter_${String(roman || "").toLowerCase()}`;
  const hint = imageHints[key] || `chapter-${String(roman||"i").toLowerCase()}-quote.jpeg`;
  return await findImageCI(path.basename(hint));
}

function splitTitleStack(fullTitle) {
  // Expect "Chapter I: Title Words ..." from YAML or H1
  const justTitle = fullTitle.replace(/^Chapter\s+[IVXLC]+\s*:\s*/i, "").trim();
  return justTitle.split(/\s+/).filter(Boolean);
}

// -------- main pass
const mdFiles = (await fsp.readdir(SRC_DIR))
  .filter(n => /Chapter-[IVXLC]+/.test(n) && /\.md$/i.test(n))
  .sort((a,b)=>a.localeCompare(b));

if (!mdFiles.length) {
  console.error("No chapter markdown files found in OEBPS/chapters_src/");
  process.exit(1);
}

for (const name of mdFiles) {
  const mdPath = path.join(SRC_DIR, name);
  const raw = await fsp.readFile(mdPath, "utf8");
  const { data: fm, content } = matter(raw);

  // Title + roman
  const titleFromFm = fm.title || content.match(/^#\s+(.+)$/m)?.[1] || "Untitled";
  let roman = fm.chapter_number;
  if (!roman) {
    const m = titleFromFm.match(/Chapter\s+([IVXLC]+)/i) || name.match(/Chapter-([IVXLC]+)/i);
    roman = m ? m[1] : "";
  }

  const titleStack = splitTitleStack(titleFromFm);
  const { epigraphText, epigraphRef, introParas, restAfterIntro } = carveEpigraphAndIntro(content);

  // Body HTML
  const bodyHtml = bodyMdToHtml(restAfterIntro);

  // Quiz + worksheet
  const quizHtml = buildQuiz(content);
  const worksheetHtml = buildWorksheet(content);

  // Footnotes
  const foots = extractFootnotes(content);
  const asideNotes = buildAsideEndnotes(foots);
  const masterNotes = buildMasterEndnotes(foots);

  // Closing image
  const closingImg = await closingImageFor(roman);

  // Fill template
  let out = template
    .replace("{{DocumentTitle}}", esc(titleFromFm))
    .replaceAll("{{Roman}}", esc(roman))
    .replace("{{EpigraphText}}", epigraphText ? esc(epigraphText) : "")
    .replace("{{EpigraphRef}}", epigraphRef ? esc(epigraphRef) : "")
    .replace("{{ClosingImage}}", closingImg)
    .replace("{{ClosingCaption}}", "")
    .replace("{{{BodyHTML}}}", bodyHtml || "")
    .replace("{{{QuizHTML}}}", quizHtml || "")
    .replace("{{{WorksheetHTML}}}", worksheetHtml || "")
    .replace("{{{AsideEndnotesHTML}}}", asideNotes || "")
    .replace("{{{MasterEndnotesHTML}}}", masterNotes || "");

  // TitleStack (simple mustache-ish)
  const stackHtml = titleStack.map(w => `<h1 class="chapter-title chapter-title-word">${esc(w)}</h1>`).join("\n            ");
  out = out.replace(
    /{{#TitleStack}}[\s\S]*?{{\/TitleStack}}/,
    stackHtml || `<h1 class="chapter-title chapter-title-word">${esc(titleFromFm)}</h1>`
  );
  // Intro paras
  const introHtml = (introParas && introParas.length)
    ? introParas.map(p => `<p>${marked.parseInline(p)}</p>`).join("")
    : "";
  out = out.replace(/{{#IntroParagraphs}}[\s\S]*?{{\/IntroParagraphs}}/, introHtml);

  // Handle conditional sections for QuizHTML, WorksheetHTML, AsideEndnotesHTML, and MasterEndnotesHTML
  if (quizHtml) {
    out = out.replace(/{{#QuizHTML}}([\s\S]*?){{\/QuizHTML}}/, '$1');
  } else {
    out = out.replace(/{{#QuizHTML}}[\s\S]*?{{\/QuizHTML}}/g, '');
  }

  if (worksheetHtml) {
    out = out.replace(/{{#WorksheetHTML}}([\s\S]*?){{\/WorksheetHTML}}/, '$1');
  } else {
    out = out.replace(/{{#WorksheetHTML}}[\s\S]*?{{\/WorksheetHTML}}/g, '');
  }

  if (asideNotes) {
    out = out.replace(/{{#AsideEndnotesHTML}}([\s\S]*?){{\/AsideEndnotesHTML}}/, '$1');
  } else {
    out = out.replace(/{{#AsideEndnotesHTML}}[\s\S]*?{{\/AsideEndnotesHTML}}/g, '');
  }

  if (masterNotes) {
    out = out.replace(/{{#MasterEndnotesHTML}}([\s\S]*?){{\/MasterEndnotesHTML}}/, '$1');
  } else {
    out = out.replace(/{{#MasterEndnotesHTML}}[\s\S]*?{{\/MasterEndnotesHTML}}/g, '');
  }

  // Ensure images point to ../images and preserve case
  out = await (async () => {
    const dom = new JSDOM(out);
    const imgs = [...dom.window.document.querySelectorAll("img[src]")];
    for (const img of imgs) {
      const file = path.posix.basename(img.getAttribute("src"));
      const mapped = await findImageCI(file);
      img.setAttribute("src", `../images/${mapped}`);
    }
    return "<!DOCTYPE html>\n" + dom.serialize();
  })();

  const outName = name.replace(/\.md$/i, ".xhtml");
  await fsp.writeFile(path.join(OUT_DIR, outName), out, "utf8");
  console.log("✓", outName);
}

console.log("\nAll chapters converted →", path.relative(ROOT, OUT_DIR));
