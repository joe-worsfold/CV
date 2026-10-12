import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(__dirname, "..");

export function loadProfile() {
  const raw = fs.readFileSync(path.join(root, "facts/profile.yaml"), "utf8");
  return YAML.parse(raw);
}

export function loadDenyList() {
  const raw = fs.readFileSync(path.join(root, "facts/deny-list.yaml"), "utf8");
  return YAML.parse(raw);
}

export function assertNoForbidden(text, deny) {
  const lower = text.toLowerCase();
  const hits = (deny.forbidden || []).filter((f) => lower.includes(String(f).toLowerCase()));
  if (hits.length) {
    throw new Error(`Deny-list hit(s): ${hits.join(", ")}`);
  }
}

export function resolveRoleTitle(role, profile, headlineOverride) {
  if (headlineOverride && role.id === "stack-foundry") {
    return headlineOverride;
  }
  if (role.title_key === "market") {
    return profile.titles.market_title;
  }
  if (role.title_key === "legal") {
    return profile.titles.legal_title;
  }
  return role.title;
}

export function formatMonth(ym) {
  if (!ym || ym === "present") return "Present";
  const [y, m] = String(ym).split("-");
  return `${m}/${y}`;
}

export function roleDateRange(role) {
  return `${formatMonth(role.start)} – ${formatMonth(role.end)}`;
}

export function selectContent(profile, options = {}) {
  const {
    tags = [],
    maxBulletsPerRole = {},
    includeOptional = profile.render_defaults?.include_optional_projects ?? false,
    headline = null,
    variant = "human",
  } = options;

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const defaults = variant === "ats" ? { stack: 4, other: 3, early: 2 } : { stack: 6, other: 5, early: 3 };

  const roles = profile.roles.map((role) => {
    const limit =
      maxBulletsPerRole[role.id] ??
      (role.id === "stack-foundry" || role.id === "aviva-zero"
        ? defaults.stack
        : role.id === "mott"
          ? defaults.early
          : defaults.other);

    let bullets = [...role.bullets];
    if (tagSet.size) {
      bullets.sort((a, b) => {
        const as = a.tags?.filter((t) => tagSet.has(t.toLowerCase())).length ?? 0;
        const bs = b.tags?.filter((t) => tagSet.has(t.toLowerCase())).length ?? 0;
        if (bs !== as) return bs - as;
        return (b.priority ?? 0) - (a.priority ?? 0);
      });
    } else {
      bullets.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    bullets = bullets.slice(0, limit);

    return {
      ...role,
      resolvedTitle: resolveRoleTitle(role, profile, headline),
      legalSubtitle:
        role.id === "stack-foundry"
          ? `${profile.titles.legal_title} · sole director`
          : null,
      dateRange: roleDateRange(role),
      bullets,
    };
  });

  let projects = [...(profile.projects || [])];
  if (includeOptional) {
    projects = projects.concat(profile.optional_projects || []);
  }
  projects.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return {
    identity: profile.identity,
    titles: profile.titles,
    headline: headline || profile.titles.market_title,
    summary: options.summary || profile.summary,
    skills: profile.skills,
    roles,
    projects,
    education: profile.education,
    variant,
  };
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function oneLine(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readTemplate(name) {
  return fs.readFileSync(path.join(root, "templates", name), "utf8");
}

export function readStyle(name) {
  return fs.readFileSync(path.join(root, "templates/styles", name), "utf8");
}
