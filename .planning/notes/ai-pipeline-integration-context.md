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

## Upstream findings (investigated 2026-04-21)

### company_research gap — it's a TRIGGER problem, not a broken workflow
- Workflow `Job Search: Company Intel` (ID `HQaq1aTSnA5TbTaS`) is **manual/webhook triggered only** (no Schedule Trigger node)
- Has 2 `production_success` events in workflow_statistics (latest Apr 8, 2026 — manual test runs)
- Has never run since, so the table is empty
- Nodes include `Insert Research`, `Parse and Insert Research`, `Link Research to Job` — writes to `company_research` + a linking column on `jobs` correctly when triggered
- **Implication:** v3.0 needs a "Research this company" action in the UI that POSTs to the n8n webhook. Do NOT auto-schedule across all 467 jobs (token waste on uninteresting jobs)

### salary_intelligence gap — Postgres parameter-pattern collision in n8n's inline interpolation
- Workflow `Job Search: Salary Intelligence` (ID `09AnUpkwujo91wFF`) has `Save Report` node using `executeQuery` mode
- SQL inlines LLM JSON via `'={{ JSON.stringify(...) }}'::jsonb` directly into the query text
- The JSON contains salary figures as text like `"$128,663"` — n8n/pg scans the resulting query for `$N` placeholders and treats every dollar amount as a parameter ref
- Hence the error `Variable $128663 exceeds supported maximum of $100000` — not a batch-INSERT batch-size issue at all
- **Fix:** switch the node to n8n's structured "Insert" operation (let the node parameterize safely), OR use named `$1, $2` params with JSON passed via the node's Parameters array. Also fixes a secondary schema bug: `raw_results` column (text) currently receives `result_count` (number)
- **Audit risk:** any other workflow using `executeQuery` mode with inline JSON that might contain dollar figures has the same latent bug

## Why this note exists

`/gsd-new-milestone` should consume this so requirement-definition works from ground truth instead of rediscovering the schema and row counts.
