import React from "react";
import ChapterCanvasIframe from "./ChapterCanvasIframe";

// Preview Chapter I exactly as it will appear in EPUB
export default function ChapterIPreview() {
  return (
    <div className="p-4 bg-slate-100 min-h-screen">
      <ChapterCanvasIframe src="/OEBPS/chapters/9-Chapter-I-Unveiling-Your-Creative-Odyssey_final.xhtml" />
    </div>
  );
}
