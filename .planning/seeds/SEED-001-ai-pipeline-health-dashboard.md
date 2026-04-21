---
id: SEED-001
status: dormant
planted: 2026-04-21
planted_during: v3.0 AI Integration scoping
trigger_when: AI Integration milestone defines requirements, OR when multiple AI workflows are observably in production and their output needs a surface-level health view
scope: Medium
---

# SEED-001: Pipeline health / aggregate AI insights dashboard

## Why This Matters

The Job Search pipeline runs ~7 n8n workflows (Collector, Evaluator, Cover Letter Gen, Salary Intel, Company Intel, Resume Tailor, Application Packager). Each produces rows somewhere in the `n8n` DB. The per-job detail sheet shows what's attached to one job — but there's no aggregate view to answer owner-level questions:

- "How many jobs were scored in the last 7 days?"
- "What's the cover-letter-generation error rate per week?"
- "How is the match-score distribution trending?"
- "Which workflow(s) are silently not producing output?" (e.g., `company_research=0 rows` was only discovered by direct DB inspection)

Without this view, silent pipeline degradation is invisible until a user clicks into a specific job and notices something missing.

## When to Surface

**Trigger:** AI Integration milestone defines requirements. Also worth considering independently once salary_intelligence + company_research gaps are fixed and data starts flowing.

Present this seed during `/gsd-new-milestone` when:
- The scope includes job-pipeline UI work
- More than one table in the pipeline is surfaced in the app (cover_letter + tailored_resume + salary_intel all rendered → a health dashboard becomes valuable)
- Owner mentions "pipeline reliability" or "workflow monitoring" concerns

## Scope Estimate

**Medium** — a phase or two:
- New route: `/admin/jobs/pipeline` or `/admin/jobs` sub-tab
- Aggregate queries across jobs, cover_letters, tailored_resumes, salary_intelligence, company_research (scoped to last 7/30 days)
- Charts: score distribution, per-workflow success rate, per-day production rates
- Could piggyback on existing `workflow_statistics` table in n8n (counts by `production_success` / `production_error`)

Not in scope of the milestone that plants this seed — scope creep risk is too high when the core detail-sheet gaps aren't closed yet.

## Breadcrumbs

- `src/lib/jobs-db.ts:408` — `getPipelineStats()` already returns basic `PipelineStats` (collected/scored/coverLetters/packaged/applied/interviews). Could extend.
- `src/app/(admin)/admin/jobs/stats-bar.tsx` — existing bar at top of /admin/jobs. Natural host for a first aggregate view.
- `execution_entity` + `workflow_statistics` (n8n internal) — source of truth for workflow success/error counts.

## Notes

Planted while scoping v3.0 AI Integration. User explicitly cut interview_prep and recruiter_outreach from the milestone — this seed is also cut from that milestone. Revisit once detail-sheet gaps close and we have observable daily data flow.
