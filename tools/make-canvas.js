#!/usr/bin/env node
/**
 * make-canvas.js
 * Generates a React preview component that renders the XHTML in an <iframe> so external CSS is preserved.
 * 
 * USAGE:
 *   node tools/make-canvas.js --xhtml OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey.xhtml --out tools/canvas/chapter-01.jsx
 * 
 * This does NOT ship in EPUB; it's for browser QA only.
 */

import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map((v,i,arr)=>{
  if (!v.startsWith('--')) return [];
  const key = v.slice(2);
  const val = (arr[i+1] && !arr[i+1].startsWith('--')) ? arr[i+1] : true;
  return [key, val];
}).filter(x=>x.length));

const inFile = args['xhtml'];
const outFile = args['out'] || 'tools/canvas/chapter-preview.jsx';
if (!inFile) {
  console.error('Usage: node tools/make-canvas.js --xhtml <file.xhtml> [--out tools/canvas/chapter-01.jsx]');
  process.exit(2);
}
const xhtml = fs.readFileSync(inFile, 'utf8');

const component = `/* eslint-disable react/no-danger */
import React, { useEffect, useRef } from "react";

/**
 * ChapterCanvasIframe
 * Renders the given XHTML in an iframe so the external CSS (../styles/*.css) applies correctly.
 * Drop this component into your dev preview app.
 */
export default function ChapterCanvasIframe() {
  const ref = useRef(null);
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(\`${xhtml.replace(/`/g, '\\`')}\`);
    doc.close();
  }, []);
  return (
    <div style={{width: "100%", height: "100%", border: "1px solid #ddd"}}>
      <iframe ref={ref} title="Chapter Preview" style={{width: "100%", height: "100%", border: "0"}} />
    </div>
  );
}
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, component, 'utf8');
console.log('Wrote', outFile);
