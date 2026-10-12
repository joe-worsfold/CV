# CV agentic pipeline — Implementation Plan

> **For agentic workers:** implement task-by-task; steps use checkbox syntax.

**Goal:** Ship a YAML-driven CV renderer and advert tailor that produces committed master HTML/PDF and gitignored per-role outputs.

**Architecture:** Canonical `facts/profile.yaml` → Node scripts select/render → HTML templates → Playwright PDF. Optional Ollama reword. Cursor skill calls CLI.

**Tech Stack:** Node 26, pnpm, yaml, Playwright, vanilla HTML/CSS templates.

## Global Constraints

- Never invent employers, metrics, or shipped status
- Never emit deny-listed strings
- No white-text keyword stuffing
- Master outputs in `dist/`; per-role in `out/` (gitignored)

---

### Task 1: Scaffold + facts

- [x] package.json, gitignore, facts, deny-list, README, skill
- [x] Populate profile from markdown + July 2025 PDF + grill locks

### Task 2: Render + PDF

- [x] human + ats templates and CSS
- [x] `pnpm cv:build` → dist md/html/pdf

### Task 3: Tailor

- [x] `pnpm cv:tailor <jd>` → out/<slug>/ with ask file when unsure
- [x] Optional Ollama reword behind flag
