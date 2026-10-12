import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertNoForbidden,
  escapeHtml,
  loadDenyList,
  loadProfile,
  oneLine,
  readStyle,
  readTemplate,
  root,
  selectContent,
} from "./lib.js";

function fill(template, map) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => map[key] ?? "");
}

function skillsHtml(skills) {
  return skills
    .map(
      (g) => `
      <div class="skill-group">
        <h3>${escapeHtml(g.group)}</h3>
        <ul>${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");
}

function skillsFlat(skills) {
  return skills.map((g) => `<p><strong>${escapeHtml(g.group)}:</strong> ${escapeHtml(g.items.join(", "))}</p>`).join("");
}

function rolesHtml(roles, { showStack = true } = {}) {
  return roles
    .map((role) => {
      const items = role.bullets
        .map((b) => {
          const prefix =
            b.status === "in_progress"
              ? `<span class="badge">In progress</span> `
              : b.status === "internal"
                ? `<span class="badge">Internal</span> `
                : "";
          return `<li>${prefix}${escapeHtml(oneLine(b.text))}</li>`;
        })
        .join("");
      return `
      <article class="role">
        <header>
          <div class="role-title">
            <h3>${escapeHtml(role.resolvedTitle)}</h3>
            <p class="employer">${escapeHtml(role.employer)}${role.location ? ` · ${escapeHtml(role.location)}` : ""}</p>
            ${role.legalSubtitle ? `<p class="legal">${escapeHtml(role.legalSubtitle)}</p>` : ""}
          </div>
          <p class="dates">${escapeHtml(role.dateRange)}</p>
        </header>
        <p class="one-liner">${escapeHtml(oneLine(role.one_liner))}</p>
        ${role.note ? `<p class="note">${escapeHtml(oneLine(role.note))}</p>` : ""}
        ${showStack && role.stack_line ? `<p class="stack">${escapeHtml(oneLine(role.stack_line))}</p>` : ""}
        <ul>${items}</ul>
      </article>`;
    })
    .join("");
}

function projectsHtml(projects) {
  if (!projects.length) return "";
  return `
    <section class="projects">
      <h2>Selected projects</h2>
      ${projects
        .map((p) => {
          const badge =
            p.status === "in_progress"
              ? `<span class="badge">In progress</span> `
              : p.status === "internal"
                ? `<span class="badge">Tooling</span> `
                : "";
          const links = (p.links || [])
            .map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`)
            .join(" · ");
          return `
          <article class="project">
            <h3>${badge}${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(oneLine(p.summary))}</p>
            ${links ? `<p class="links">${links}</p>` : ""}
          </article>`;
        })
        .join("")}
    </section>`;
}

function educationHtml(education) {
  return education
    .map((e) => {
      const dates = `${e.start?.slice(0, 4) ?? ""} – ${e.end?.slice(0, 4) ?? ""}`;
      return `
      <article class="edu">
        <header>
          <h3>${escapeHtml(e.institution)}</h3>
          <p class="dates">${escapeHtml(dates)}</p>
        </header>
        <p class="award">${escapeHtml(e.award)}${e.result ? `, ${escapeHtml(e.result)}` : ""}</p>
        ${e.summary ? `<p>${escapeHtml(oneLine(e.summary))}</p>` : ""}
        ${e.thesis ? `<p class="thesis"><strong>Thesis:</strong> ${escapeHtml(oneLine(e.thesis))}</p>` : ""}
      </article>`;
    })
    .join("");
}

function contactHtml(identity) {
  const links = (identity.links || []).map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`).join(" · ");
  return `
    <p class="contact">
      ${escapeHtml(identity.location)}
      ${identity.phone ? ` · ${escapeHtml(identity.phone)}` : ""}
      ${identity.email ? ` · <a href="mailto:${escapeHtml(identity.email)}">${escapeHtml(identity.email)}</a>` : ""}
      ${links ? ` · ${links}` : ""}
    </p>`;
}

function metaSidebar(model) {
  const prefs = model.identity.preferences || {};
  return `
    <div class="meta">
      <h3>Focus</h3>
      <ul>${(prefs.targets || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      <h3>Eligibility</h3>
      <p>${escapeHtml(model.identity.work_eligibility || "UK")}</p>
      <h3>Work type</h3>
      <p>${escapeHtml(prefs.work_type || "Flexible")}</p>
    </div>`;
}

function toMarkdown(model) {
  const lines = [];
  lines.push(`# ${model.identity.name}`);
  lines.push("");
  lines.push(`**${model.headline}**`);
  lines.push("");
  lines.push(oneLine(model.summary));
  lines.push("");
  lines.push("## Skills");
  for (const g of model.skills) {
    lines.push(`- **${g.group}:** ${g.items.join(", ")}`);
  }
  lines.push("");
  lines.push("## Experience");
  for (const role of model.roles) {
    lines.push("");
    lines.push(`### ${role.resolvedTitle} | ${role.employer} | ${role.dateRange}`);
    if (role.legalSubtitle) lines.push(`*${role.legalSubtitle}*`);
    lines.push("");
    lines.push(oneLine(role.one_liner));
    if (role.note) lines.push(`*${oneLine(role.note)}*`);
    if (role.stack_line) lines.push(`\n\`${oneLine(role.stack_line)}\``);
    lines.push("");
    for (const b of role.bullets) {
      const tag = b.status === "in_progress" ? " *(in progress)*" : b.status === "internal" ? " *(internal)*" : "";
      lines.push(`- ${oneLine(b.text)}${tag}`);
    }
  }
  if (model.projects.length) {
    lines.push("");
    lines.push("## Selected projects");
    for (const p of model.projects) {
      lines.push("");
      lines.push(`### ${p.name}`);
      lines.push(oneLine(p.summary));
    }
  }
  lines.push("");
  lines.push("## Education");
  for (const e of model.education) {
    lines.push("");
    lines.push(`### ${e.institution} | ${e.award}${e.result ? `, ${e.result}` : ""}`);
    if (e.summary) lines.push(oneLine(e.summary));
    if (e.thesis) lines.push(`**Thesis:** ${oneLine(e.thesis)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function renderVariant(variant, options = {}) {
  const profile = loadProfile();
  const deny = loadDenyList();
  const model = selectContent(profile, { ...options, variant });
  const css = readStyle(variant === "ats" ? "ats.css" : "human.css");
  const template = readTemplate(variant === "ats" ? "ats.html" : "human.html");

  const html = fill(template, {
    TITLE: escapeHtml(`${model.identity.name} — ${model.headline}`),
    NAME: escapeHtml(model.identity.name),
    HEADLINE: escapeHtml(model.headline),
    SUMMARY: escapeHtml(oneLine(model.summary)),
    CONTACT: contactHtml(model.identity),
    META: metaSidebar(model),
    SKILLS: variant === "ats" ? skillsFlat(model.skills) : skillsHtml(model.skills),
    ROLES: rolesHtml(model.roles, { showStack: true }),
    PROJECTS: projectsHtml(model.projects),
    EDUCATION: educationHtml(model.education),
    CSS: css,
  });

  assertNoForbidden(html, deny);
  const md = toMarkdown(model);
  assertNoForbidden(md, deny);
  return { html, md, model };
}

function parseArgs(argv) {
  const out = { variant: "human", outDir: path.join(root, "dist") };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--variant") out.variant = argv[++i];
    else if (a === "--out") out.outDir = path.resolve(argv[++i]);
    else if (a === "--headline") out.headline = argv[++i];
    else if (a === "--include-sentinel") out.includeOptional = true;
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const { html, md } = renderVariant(args.variant, args);
  fs.mkdirSync(args.outDir, { recursive: true });
  const base = args.variant === "ats" ? "joe-worsfold-cv.ats" : "joe-worsfold-cv";
  fs.writeFileSync(path.join(args.outDir, `${base}.html`), html);
  fs.writeFileSync(path.join(args.outDir, `${base}.md`), md);
  console.log(`Wrote ${base}.html and ${base}.md → ${args.outDir}`);
}
