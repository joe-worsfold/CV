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

const ICONS = {
  pin: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>`,
  phone: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 7a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"/></svg>`,
  mail: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5z"/></svg>`,
};

function chips(items) {
  return `<div class="chips">${items.map((i) => `<span class="chip">${escapeHtml(i)}</span>`).join("")}</div>`;
}

function skillsHtml(skills) {
  return skills
    .map(
      (g) => `
      <div class="fact">
        <h3>${escapeHtml(g.group)}</h3>
        ${chips(g.items)}
      </div>`,
    )
    .join("");
}

function skillsFlat(skills) {
  return skills.map((g) => `<p><strong>${escapeHtml(g.group)}:</strong> ${escapeHtml(g.items.join(", "))}</p>`).join("");
}

function stackHtml(stackLine) {
  if (!stackLine) return "";
  const raw = oneLine(stackLine);
  const parts = raw.includes("|")
    ? raw.split("|").map((s) => s.trim()).filter(Boolean)
    : raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return `<p class="stack">${chips(parts)}</p>`;
  return `<p class="stack-line">${escapeHtml(raw)}</p>`;
}

function bulletHtml(b) {
  const lead = b.lead ? `<strong>${escapeHtml(b.lead)}:</strong> ` : "";
  return `<li>${lead}${escapeHtml(oneLine(b.text))}</li>`;
}

function rolesHtml(roles) {
  return roles
    .map((role) => {
      const items = role.bullets.map(bulletHtml).join("");
      return `
      <article class="role">
        <header>
          <div class="role-title">
            <h3>${escapeHtml(role.resolvedTitle)}${role.employer ? `, ${escapeHtml(role.employer)}` : ""}</h3>
            ${
              role.location
                ? `<p class="employer">${ICONS.pin} ${escapeHtml(role.location)}</p>`
                : ""
            }
          </div>
          <p class="dates">${escapeHtml(role.dateRange)}<span>${escapeHtml(role.duration)}</span></p>
        </header>
        <p class="one-liner">${escapeHtml(oneLine(role.one_liner))}</p>
        ${role.note ? `<p class="note">${escapeHtml(oneLine(role.note))}</p>` : ""}
        ${stackHtml(role.stack_line)}
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
          <div>
            <h3>${escapeHtml(e.institution)}</h3>
            <p class="award">${escapeHtml(e.award)}${e.result ? `, ${escapeHtml(e.result)}` : ""}</p>
          </div>
          <p class="dates">${escapeHtml(dates)}</p>
        </header>
        ${e.summary ? `<p>${escapeHtml(oneLine(e.summary))}</p>` : ""}
        ${e.thesis ? `<p class="thesis"><strong>Thesis:</strong> ${escapeHtml(oneLine(e.thesis))}</p>` : ""}
      </article>`;
    })
    .join("");
}

function contactItem(icon, inner) {
  return `<span class="contact-item">${icon}${inner}</span>`;
}

function contactHtml(identity, { icons = false } = {}) {
  const links = (identity.links || []).map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a>`);
  if (!icons) {
    const bits = [identity.location, identity.phone, identity.email ? `<a href="mailto:${escapeHtml(identity.email)}">${escapeHtml(identity.email)}</a>` : "", ...links].filter(
      Boolean,
    );
    return `<p class="contact">${bits.join(" · ")}</p>`;
  }
  const parts = [
    identity.location ? contactItem(ICONS.pin, escapeHtml(identity.location)) : "",
    identity.phone ? contactItem(ICONS.phone, escapeHtml(identity.phone)) : "",
    identity.email
      ? contactItem(ICONS.mail, `<a href="mailto:${escapeHtml(identity.email)}">${escapeHtml(identity.email)}</a>`)
      : "",
    ...links.map((html) => `<span class="contact-item">${html}</span>`),
  ].filter(Boolean);
  return `<p class="contact">${parts.join("")}</p>`;
}

function factBlock(title, items) {
  if (!items?.length) return "";
  return `
    <div class="fact">
      <h3>${escapeHtml(title)}</h3>
      ${items.length === 1 ? `<p>${escapeHtml(items[0])}</p>` : chips(items)}
    </div>`;
}

function metaSidebar(model) {
  const prefs = model.identity.preferences || {};
  const side = model.sidebar || {};
  return [
    factBlock("Positions", side.positions),
    factBlock("Experience level", side.experience_level),
    factBlock("Work eligibility", [model.identity.work_eligibility].filter(Boolean)),
    factBlock("Work type", [prefs.work_type].filter(Boolean)),
    factBlock("Languages", model.identity.languages),
  ].join("");
}

function photoHtml(src, name) {
  if (!src) return "";
  return `<img class="portrait" src="${src}" alt="Portrait of ${escapeHtml(name)}" width="128" height="128" />`;
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
    lines.push(`### ${role.resolvedTitle} | ${role.employer} | ${role.dateRange} (${role.duration})`);
    lines.push("");
    lines.push(oneLine(role.one_liner));
    if (role.note) lines.push(`*${oneLine(role.note)}*`);
    if (role.stack_line) lines.push(`\n\`${oneLine(role.stack_line)}\``);
    lines.push("");
    for (const b of role.bullets) {
      const tag = b.status === "in_progress" ? " *(in progress)*" : b.status === "internal" ? " *(internal)*" : "";
      const lead = b.lead ? `**${b.lead}:** ` : "";
      lines.push(`- ${lead}${oneLine(b.text)}${tag}`);
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
  const css =
    (variant === "ats" ? readStyle("ats.css") : readStyle("human.css")) +
    (options.cssAppend ? `\n${options.cssAppend}` : "");
  const template = readTemplate(variant === "ats" ? "ats.html" : "human.html");
  const human = variant === "human";

  const html = fill(template, {
    TITLE: escapeHtml(`${model.identity.name} — ${model.headline}`),
    NAME: escapeHtml(model.identity.name),
    HEADLINE: escapeHtml(model.headline),
    SUMMARY: escapeHtml(oneLine(model.summary)),
    CONTACT: contactHtml(model.identity, { icons: human }),
    PHOTO: photoHtml(model.photo, model.identity.name),
    META: metaSidebar(model),
    SKILLS: human ? skillsHtml(model.skills) : skillsFlat(model.skills),
    ROLES: rolesHtml(model.roles),
    PROJECTS: projectsHtml(model.projects),
    EDUCATION: educationHtml(model.education),
    CSS: css,
    THEME: escapeHtml(options.theme || "theme-default"),
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
