---
name: cv-tailor
description: Tailor Joe's CV from a job description using the repo CLI. Never invent facts.
---

# CV tailor

## When to use

User pastes a job advert or asks for a role-specific CV / PDF from this repo.

## Rules

1. Edit or rely on `facts/profile.yaml` — do not invent employers, metrics, or shipped status.
2. Respect `facts/deny-list.yaml` (no client names, no trading P&L, no secrets).
3. Run the CLI; do not hand-author a full CV in chat.
4. If the JD needs a claim not in facts, stop and ask — write it into `ASK.md` thinking.

## Commands

```bash
pnpm cv:build
pnpm cv:tailor <jd-path> --headline "Staff AI Engineer"
pnpm cv:tailor <jd-path> --headline "Staff AI Engineer" --ollama
pnpm cv:tailor <jd-path> --include-sentinel
```

Default headline for Staff AI adverts: `Staff AI Engineer`.  
Master market title in facts: `Founder & Principal Architect` (aligned with LinkedIn).

## Outputs

- Master: `dist/joe-worsfold-cv.{html,pdf,md}` (+ `.ats.*`)
- Per role: `out/<slug>/` (gitignored)
