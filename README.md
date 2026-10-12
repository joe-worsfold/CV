# Joe Worsfold — CV pipeline

Canonical facts live in YAML. HTML + PDF are generated. Paste a job description to tailor a role-specific pack without inventing claims.

**Target roles:** Staff AI Engineer (default), founding / principal platform roles.

## Quick start

```bash
pnpm install          # installs Chromium for PDF via Playwright
pnpm cv:build         # → dist/ + root joe-worsfold-cv.{md,html,pdf}
```

Open `dist/joe-worsfold-cv.html` (human, two-column) or `dist/joe-worsfold-cv.ats.html` (ATS single-column).

```bash
pnpm cv:variants          # 10 HTML/PDF styles → dist/variants/index.html
```

## Edit your facts

**You can edit these now:**

| File | Purpose |
| --- | --- |
| [`facts/profile.yaml`](./facts/profile.yaml) | Identity, titles, summary, skills, roles, bullets, projects, education |
| [`facts/deny-list.yaml`](./facts/deny-list.yaml) | Strings that must never appear in outputs |

Each bullet has `status`: `shipped` | `in_progress` | `internal`, plus `tags` and `priority` for advert ranking.

Then rebuild:

```bash
pnpm cv:build
```

## Tailor from a job description

```bash
# copy a JD into inbox/ (gitignored) or pass any path
pnpm cv:tailor examples/staff-ai-sample-jd.md --headline "Staff AI Engineer"

# optional: local LLM rewords summary only (Ollama must be running)
pnpm cv:tailor inbox/my-role.md --headline "Staff AI Engineer" --ollama

# opt-in research project (Sentinel)
pnpm cv:tailor inbox/my-role.md --include-sentinel
```

Outputs land in `out/<slug>/` (gitignored): `cv.html`, `cv.pdf`, `cv.ats.*`, `ASK.md`, and a copy of the JD.

If the tool is unsure about a JD claim, it writes questions into `ASK.md` instead of inventing facts.

## Cursor skill

Use the in-repo skill [`.cursor/skills/cv-tailor/SKILL.md`](./.cursor/skills/cv-tailor/SKILL.md): paste an advert in chat; the agent should run the CLI, never freehand a CV past the fact file.

## Layouts

| Variant | File | Notes |
| --- | --- | --- |
| `human` | `joe-worsfold-cv.html` | Dense two-column, ≤3 pages, print CSS |
| `ats` | `joe-worsfold-cv.ats.html` | Single-column, ≤2 pages, portal-safe |

No hidden white-text keyword stuffing. Keywords are aligned visibly via bullet selection and optional summary reword.

## Repo layout

```text
facts/           canonical truth
templates/       human + ats HTML/CSS
scripts/         build, render, pdf, tailor
dist/            committed master renders
inbox/           your JDs (gitignored)
out/             per-role packs (gitignored)
examples/        sample JD for trying the tailor
```

## For others forking this

1. Replace `facts/profile.yaml` with your own career facts.
2. Adjust `facts/deny-list.yaml`.
3. Tweak `templates/` CSS if you want a different look.
4. `pnpm install && pnpm cv:build`.

Node 22+ recommended (repo author uses Node 26).

## Design notes

- Spec: [`docs/superpowers/specs/2026-10-13-cv-agentic-pipeline-design.md`](./docs/superpowers/specs/2026-10-13-cv-agentic-pipeline-design.md)
- Plan: [`docs/superpowers/plans/2026-10-13-cv-agentic-pipeline.md`](./docs/superpowers/plans/2026-10-13-cv-agentic-pipeline.md)
