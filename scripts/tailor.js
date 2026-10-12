import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  loadProfile,
  oneLine,
  root,
  slugify,
} from "./lib.js";
import { htmlToPdf } from "./pdf.js";
import { renderVariant } from "./render.js";

function parseArgs(argv) {
  const out = {
    jdPath: null,
    headline: null,
    includeOptional: false,
    ollama: false,
    model: process.env.OLLAMA_MODEL || "llama3.2",
    variant: "both",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--headline") out.headline = argv[++i];
    else if (a === "--include-sentinel") out.includeOptional = true;
    else if (a === "--ollama") out.ollama = true;
    else if (a === "--model") out.model = argv[++i];
    else if (a === "--variant") out.variant = argv[++i];
    else if (!a.startsWith("-") && !out.jdPath) out.jdPath = a;
  }
  return out;
}

function extractTags(jdText, profile) {
  const lower = jdText.toLowerCase();
  const catalog = new Set();
  for (const role of profile.roles) {
    for (const b of role.bullets) for (const t of b.tags || []) catalog.add(t.toLowerCase());
  }
  for (const p of [...(profile.projects || []), ...(profile.optional_projects || [])]) {
    for (const t of p.tags || []) catalog.add(t.toLowerCase());
  }
  return [...catalog].filter((t) => lower.includes(t.replace(/-/g, " ")) || lower.includes(t));
}

function findUnsureClaims(jdText, profile) {
  const asks = [];
  const lower = jdText.toLowerCase();
  const known = JSON.stringify(profile).toLowerCase();

  const probes = [
    { re: /pytorch|tensorflow|cuda|gpu cluster/i, hint: "Deep learning / GPU training stack not strongly evidenced — confirm before claiming." },
    { re: /fine-?tun/i, hint: "Fine-tuning appears in JD; facts emphasise RAG/agents/evals — confirm before claiming fine-tuning." },
    { re: /kubernetes|k8s/i, hint: "K8s is in older roles; confirm emphasis vs serverless." },
    { re: /staff ai|founding engineer|principal/i, hint: "Set --headline to match the JD title if you want ATS alignment." },
  ];

  for (const p of probes) {
    if (p.re.test(jdText) && !p.re.test(known)) {
      // still surface headline tip even if known
    }
    if (p.re.test(jdText)) asks.push(p.hint);
  }

  if (lower.includes("sentinel") || lower.includes("quant") || lower.includes("trading")) {
    asks.push("JD looks quant/RAG-research flavoured — consider --include-sentinel.");
  }

  // Deduplicate
  return [...new Set(asks)];
}

async function maybeRewordSummary(summary, jdText, { ollama, model }) {
  if (!ollama) return { summary, usedLlm: false };
  try {
    const prompt = `Rewrite this CV summary for the job description. Rules: only reword and shift focus; never invent employers, products, metrics, or skills not implied by the summary. Max 80 words. Return summary text only.\n\nSUMMARY:\n${summary}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 6000)}`;
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    const text = oneLine(data.response || "");
    if (!text || text.length < 40) throw new Error("empty LLM summary");
    return { summary: text, usedLlm: true };
  } catch (err) {
    console.warn(`Ollama reword skipped: ${err.message}`);
    return { summary, usedLlm: false };
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.jdPath) {
  console.error("Usage: pnpm cv:tailor <jd.md> [--headline ...] [--ollama] [--include-sentinel] [--variant human|ats|both]");
  process.exit(1);
}

const jdPath = path.resolve(args.jdPath);
const jdText = fs.readFileSync(jdPath, "utf8");
const profile = loadProfile();
const tags = extractTags(jdText, profile);
const asks = findUnsureClaims(jdText, profile);

const slug = slugify(path.basename(jdPath, path.extname(jdPath)) || "role");
const outDir = path.join(root, "out", slug);
ensureDir(outDir);

const { summary, usedLlm } = await maybeRewordSummary(profile.summary, jdText, args);

const options = {
  tags,
  headline: args.headline,
  includeOptional: args.includeOptional,
  summary,
};

const variants = args.variant === "both" ? ["human", "ats"] : [args.variant];
for (const variant of variants) {
  const { html, md } = renderVariant(variant, options);
  const base = variant === "ats" ? "cv.ats" : "cv";
  const htmlPath = path.join(outDir, `${base}.html`);
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(path.join(outDir, `${base}.md`), md);
  await htmlToPdf(htmlPath, path.join(outDir, `${base}.pdf`));
}

fs.copyFileSync(jdPath, path.join(outDir, "job-description.md"));
fs.writeFileSync(
  path.join(outDir, "ASK.md"),
  [
    "# Tailor ask-list",
    "",
    "The generator never invents facts. Review these before sending:",
    "",
    ...(asks.length ? asks.map((a) => `- ${a}`) : ["- No automatic uncertainty flags."]),
    "",
    `## Run metadata`,
    "",
    `- tags matched: ${tags.join(", ") || "(none)"}`,
    `- headline: ${args.headline || profile.titles.market_title}`,
    `- ollama reword: ${usedLlm}`,
    `- include sentinel: ${args.includeOptional}`,
    "",
  ].join("\n"),
);

console.log(`Tailored CV → ${path.relative(root, outDir)}`);
if (asks.length) {
  console.log("Review out/.../ASK.md — confirm before applying.");
}
