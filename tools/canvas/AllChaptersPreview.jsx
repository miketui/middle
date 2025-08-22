import React, { useState } from "react";
import ChapterCanvasIframe from "./ChapterCanvasIframe";

const CHAPTERS = [
  "9-Chapter-I-Unveiling-Your-Creative-Odyssey_final.xhtml",
  "10-Chapter-II-Refining-Your-Creative-Toolkit_final.xhtml",
  "11-Chapter-III-Reigniting-Your-Creative-Fire_final.xhtml",
  "13-Chapter-IV-The-Art-of-Networking-in-Freelance-Hairstyling_final.xhtml",
  "14-Chapter-V-Cultivating-Creative-Excellence-Through-Mentorship_final.xhtml",
  "15-Chapter-VI-Mastering-the-Business-of-Hairstyling_final.xhtml",
  "16-Chapter-VII-Embracing-Wellness-and-Self-Care_final.xhtml",
  "17-Chapter-VIII-Advancing-Skills-Through-Continuous-Education_final.xhtml",
  "19-Chapter-IX-Stepping-Into-Leadership_final.xhtml",
  "20-Chapter-X-Crafting-Enduring-Legacies_final.xhtml",
  "21-Chapter-XI-Advanced-Digital-Strategies-for-Freelance-Hairstylists_final.xhtml",
  "22-Chapter-XII-Financial-Wisdom-Building-Sustainable-Ventures_final.xhtml",
  "23-Chapter-XIII-Embracing-Ethics-and-Sustainability-in-Hairstyling_final.xhtml",
  "25-Chapter-XIV-The-Impact-of-AI-on-the-Beauty-Industry_final.xhtml",
  "26-Chapter-XV-Cultivating-Resilience-and-Well-Being-in-Hairstyling_final.xhtml",
  "27-Chapter-XVI-Tresses-and-Textures-Embracing-Diversity-in-Hairstyling_final.xhtml"
];

export default function AllChaptersPreview() {
  const [idx, setIdx] = useState(0);
  const base = "/OEBPS/chapters/";

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-5xl mx-auto mb-4 flex gap-2 items-center">
        <label className="font-medium">Preview chapter:</label>
        <select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          {CHAPTERS.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
      </div>
      <ChapterCanvasIframe src={base + CHAPTERS[idx]} />
    </div>
  );
}
