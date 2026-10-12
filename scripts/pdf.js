import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { ensureDir, root } from "./lib.js";

export async function htmlToPdf(htmlPath, pdfPath) {
  ensureDir(path.dirname(pdfPath));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.resolve(htmlPath)).href, {
      waitUntil: "networkidle",
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
if (args.length >= 1 && process.argv[1]?.endsWith("pdf.js")) {
  const htmlPath = path.resolve(args[0]);
  const pdfPath = path.resolve(args[1] || htmlPath.replace(/\.html$/i, ".pdf"));
  await htmlToPdf(htmlPath, pdfPath);
  console.log(`Wrote ${path.relative(root, pdfPath)}`);
}
