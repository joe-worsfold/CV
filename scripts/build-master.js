import fs from "node:fs";
import path from "node:path";
import { ensureDir, root } from "./lib.js";
import { htmlToPdf } from "./pdf.js";
import { renderVariant } from "./render.js";

const dist = path.join(root, "dist");
ensureDir(dist);

for (const variant of ["human", "ats"]) {
  const { html, md } = renderVariant(variant);
  const base = variant === "ats" ? "joe-worsfold-cv.ats" : "joe-worsfold-cv";
  const htmlPath = path.join(dist, `${base}.html`);
  const mdPath = path.join(dist, `${base}.md`);
  const pdfPath = path.join(dist, `${base}.pdf`);
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(mdPath, md);
  await htmlToPdf(htmlPath, pdfPath);
  console.log(`Master ${variant}: ${base}.{html,md,pdf}`);
}

// Convenience copies at repo root for the human master (readable in GitHub)
for (const ext of ["md", "html", "pdf"]) {
  fs.copyFileSync(
    path.join(dist, `joe-worsfold-cv.${ext}`),
    path.join(root, `joe-worsfold-cv.${ext}`),
  );
}

console.log("Copied human master to repo root.");
