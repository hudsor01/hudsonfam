---
title: AI Pipeline Integration — ground-truth context
date: 2026-04-21
context: Exploration captured before defining requirements for the "AI Integration" milestone. Documents exact data-plumbing state so requirement scoping doesn't start from guesses.
---

# AI Pipeline Integration — ground-truth context

## What "AI Integration" actually means for hudsonfam

Not "add new LLM features." The n8n Job Search workflows already run LLMs and produce structured output. The gap is that **none of that output surfaces on /admin/jobs in thehudsonfam.com**.

## Data topology

- `JOBS_DATABASE_URL` points to the **`n8n` database** (same Postgres cluster, same DB n8n uses for its own workflow state). Pipeline outputs live alongside n8n's system tables.
- Access via `src/lib/jobs-db.ts` using a shared `pg.Pool` (max=3, idleTimeout=30s). Not in Prisma schema.
- TypeScript types in `jobs-db.ts` already exist for `Job`, `CoverLetter`, `CompanyResearch`, `TailoredResume`, `RecruiterOutreach`.

## Row counts (as of 2026-04-21)

| Table | Rows | UI surfaced? |
|---|---|---|
| `jobs` | 467 | ✅ dashboard + detail |
| `cover_letters` | 11 | ✅ detail sheet |
| `company_research` | **0** | ✅ detail sheet ready, but no data |
| `tailored_resumes` | 6 | ❌ queried, not rendered |
| `salary_intelligence` | **0** | ❌ not modeled in app; workflow broken (see below) |
| `applications` | 2 | — |
| `resumes` | 1 | — (owner-level config) |

## What `getJobDetail()` already does

The SQL in `jobs-db.ts` (lines 271-398) already LEFT JOINs `cover_letters`, `company_research`, `tailored_resumes`, and queries `recruiter_outreach` separately. `JobDetail` interface composes them. Cover letter + company research are rendered in `job-detail-sheet.tsx`. Tailored resume is joined but **not rendered**.

## Explicit scope decisions

**IN SCOPE for this milestone:**
1. **Tailored resumes UI gap** — data exists (6 rows), query exists, no render. Add section to detail sheet.
2. **Company research data gap** — UI renders it but source workflow produces nothing. Diagnose + fix the pipeline side.
3. **Salary intelligence** — currently unmodeled app-side and workflow broken (see task #11: Postgres batch-INSERT parameter-limit bug, $128k > $100k max). Model + query + render AND fix workflow.

**OUT OF SCOPE (explicit):**
- **Interview prep** — user does not care.
- **Recruiter outreach** — user does not care.
  Both tables will remain but neither will be surfaced or workflow-fixed.

**Maybe later (captured as seed):**
- Pipeline health / aggregate AI insights dashboard (cross-cutting view: scored last 7d, cover letters generated, workflow error rate). See `.planning/seeds/SEED-001-ai-pipeline-health-dashboard.md`.

## Upstream dependencies (tracked elsewhere)

- **Task #11** (homelab backlog) — Fix Salary Intel n8n workflow's batch-INSERT parameter-limit bug. Prerequisite for salary_intelligence having data to render.
- Workflow-side diagnostics for why `company_research` produces zero rows — likely a workflow-config issue, not a schema issue.

## Why this note exists

`/gsd-new-milestone` should consume this so requirement-definition works from ground truth instead of rediscovering the schema and row counts.
