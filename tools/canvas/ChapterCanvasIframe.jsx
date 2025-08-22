import React, { useEffect, useRef, useState } from "react";

/**
 * Exact-fidelity canvas for a chapter XHTML.
 *
 * Props:
 * - src      : URL/path to the chapter .xhtml file (preferred)
 * - xhtml    : string of the entire chapter .xhtml (optional if src provided)
 * - cssHrefs : array of CSS hrefs to inject (default: ["../styles/fonts.css","../styles/style.css"])
 *
 * Notes:
 * - We inject the XHTML <body> markup into an <iframe> and link the SAME CSS used by EPUB.
 * - This preserves the brushstroke+Roman badge, vertical title bar, stacked H1’s, drop cap, etc.
 * - All images resolve relative to the .xhtml location. Keep your repo tree the same as /OEBPS/.
 */
export default function ChapterCanvasIframe({
  src,
  xhtml,
  cssHrefs = ["../styles/fonts.css", "../styles/style.css"],
  iframeTitle = "Chapter Canvas",
  className = "w-full max-w-[900px] mx-auto bg-white rounded-xl shadow-xl overflow-hidden"
}) {
  const iframeRef = useRef(null);
  const [docString, setDocString] = useState(xhtml || "");

  // Fetch the XHTML if a src URL is provided.
  useEffect(() => {
    let abort = false;
    async function load() {
      if (!src) return;
      const res = await fetch(src, { cache: "no-cache" });
      const text = await res.text();
      if (!abort) setDocString(text);
    }
    if (src && !xhtml) load();
    return () => { abort = true; };
  }, [src, xhtml]);

  // Write a full HTML document into the iframe using the body markup from the XHTML.
  useEffect(() => {
    if (!docString || !iframeRef.current) return;
    const parser = new DOMParser();
    const parsed = parser.parseFromString(docString, "text/html");
    const bodyInner = parsed?.body?.innerHTML || "";

    const htmlShell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${cssHrefs.map(h => `<link rel="stylesheet" type="text/css" href="${h}">`).join("\n")}
</head>
<body class="chap-title">
${bodyInner}
</body>
</html>`;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(htmlShell);
    doc.close();
  }, [docString, cssHrefs]);

  return (
    <div className={className}>
      <iframe
        ref={iframeRef}
        title={iframeTitle}
        style={{ width: "100%", minHeight: "1200px", border: "0" }}
      />
    </div>
  );
}
