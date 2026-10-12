# CV agentic pipeline — design

Date: 2026-10-13

## Goal

Maintain one canonical fact file for Joe Worsfold’s CV, render professional HTML/PDF (human + ATS), and tailor outputs from a job description without inventing claims. Default market target: Staff AI Engineer. Dual founding-engineer track later.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Primary target | Staff AI Engineer; founding dual-track later |
| Disclosure | Name products with deny-list; no client name / PII |
| Claim ceiling | `shipped` \| `in_progress` \| `internal`; Prism = a2a / local context / doc embeddings, not oversold |
| Stack Foundry client | Production MDM for specialty insurance (anonymized): RAG, embeddings, OpenSearch semantic enrichment, agentic ER, workflows, AI-native enablement |
| Helmsman | Own tooling; used on Prism + NIDOS; inspired by live flows — not claimed as client deploy |
| Timeline | Consultancy started while wrapping Aviva |
| Titles | `legal_title` Technical Director; `market_title` Principal Engineer (AI & Platform); per-run headline override |
| Layout | Dual: dense two-column `human` (≤3p) + single-column `ats` (≤2p) |
| Tailor | Hybrid: deterministic select/rank; local LLM reword only; ask if unsure; never invent |
| Projects on master | Helmsman + Hate Detector; Prism in SF bullets; Sentinel opt-in |
| Source of truth | `facts/profile.yaml` |
| Invoke | CLI engine + Cursor skill wrapper |
| Render | HTML templates + Playwright PDF |
| Hidden white text | Removed — keyword alignment is visible only |

## Architecture

```text
facts/*.yaml  →  select/rank (± Ollama reword)  →  templates  →  dist/ | out/<slug>/
                                                      ↓
                                              Playwright PDF
```

## Non-goals (v1)

- Dual-track founding profile automation
- Watch-folder auto-build
- Cloud LLM requirement
- Publishing client identity
