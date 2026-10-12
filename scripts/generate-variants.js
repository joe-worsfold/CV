import fs from "node:fs";
import path from "node:path";
import { ensureDir, readStyle, root } from "./lib.js";
import { htmlToPdf } from "./pdf.js";
import { renderVariant } from "./render.js";

const variants = [
  { id: "01-teal-faithful", name: "Teal-faithful", note: "Cool gray canvas, blue title rules, most like the Teal PDF." },
  { id: "02-sf-airy", name: "SF airy", note: "Same air as Teal, orange on titles only. Recommended default." },
  { id: "03-sidebar-bubble", name: "Sidebar bubble", note: "Rounded gray sidebar card plus pill chips." },
  { id: "04-max-air", name: "Max air", note: "Largest type and gaps. Fewest items per page." },
  { id: "05-compact", name: "Compact", note: "Smallest density. More on page 1." },
  { id: "06-warm-paper", name: "Warm paper", note: "Cream canvas and peach chips." },
  { id: "07-hairline", name: "Hairline", note: "Quiet slate separators; orange titles only." },
  { id: "08-split-panel", name: "Split panel", note: "Tinted sidebar column, white main." },
  { id: "09-big-chips", name: "Big chips", note: "Larger, rounder skill bubbles." },
  { id: "10-editorial", name: "Editorial", note: "Bigger name, more margin, thin title rules." },
];

const outDir = path.join(root, "dist/variants");
ensureDir(outDir);

const cards = [];
for (const v of variants) {
  const cssAppend = readStyle(`variants/${v.id}.css`);
  const { html } = renderVariant("human", { theme: v.id, cssAppend });
  const htmlPath = path.join(outDir, `${v.id}.html`);
  const pdfPath = path.join(outDir, `${v.id}.pdf`);
  fs.writeFileSync(htmlPath, html);
  await htmlToPdf(htmlPath, pdfPath);
  cards.push(
    `<article class="card">
      <h2>${v.id} — ${v.name}</h2>
      <p>${v.note}</p>
      <p><a href="${v.id}.html">HTML</a> · <a href="${v.id}.pdf">PDF</a></p>
    </article>`,
  );
  console.log(v.id);
}

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CV style variants</title>
  <style>
    body { font-family: Avenir Next, Segoe UI, sans-serif; max-width: 720px; margin: 2rem auto; line-height: 1.45; }
    .card { border: 1px solid #d5dee6; border-radius: 12px; padding: 1rem 1.1rem; margin: 0.7rem 0; }
    a { color: #c94d00; }
  </style>
</head>
<body>
  <h1>CV style multivariate test</h1>
  <p>Same content. Pick a style. Master default is the airy gray canvas in the repo root.</p>
  ${cards.join("\n")}
</body>
</html>`,
);

console.log(`Wrote ${variants.length} variants → ${path.relative(root, outDir)}`);
