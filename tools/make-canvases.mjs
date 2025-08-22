#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_XHTML = path.join(ROOT, "OEBPS", "complete");
const OUT_CANVAS = path.join(ROOT, "OEBPS", "react");
await fs.mkdir(OUT_CANVAS, { recursive: true });

const files = (await fs.readdir(OUT_XHTML))
  .filter(n => /\.xhtml$/i.test(n))
  .sort((a,b)=>a.localeCompare(b));

for (const f of files) {
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Canvas: ${f}</title>
<style>
  body{margin:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  .wrap{max-width:980px;margin:2rem auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden}
  iframe{width:100%;min-height:1400px;border:0;display:block}
  header{padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600}
</style>
</head>
<body>
  <div class="wrap">
    <header>Preview: ${f}</header>
    <iframe src="../complete/${f}" title="${f}"></iframe>
  </div>
</body></html>`;
  const out = path.join(OUT_CANVAS, f.replace(/\.xhtml$/i, "_canvas.html"));
  await fs.writeFile(out, html, "utf8");
  console.log("✓ canvas", path.basename(out));
}
console.log("\nAll canvases written →", path.relative(ROOT, OUT_CANVAS));
