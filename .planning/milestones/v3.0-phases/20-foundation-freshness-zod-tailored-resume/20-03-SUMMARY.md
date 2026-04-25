---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 03
subsystem: database
tags: [zod, safeparse, schema-validation, fail-open, jobs-db, postgres]

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: "n/a (independent data-boundary plan; no intra-phase predecessor)"
provides:
  - "src/lib/jobs-schemas.ts exposing CoverLetterSchema, CompanyResearchSchema, TailoredResumeSchema + parseOrLog<T> helper"
  - "getJobDetail now validates cover_letter, company_research, and tailored_resume via parseOrLog at the return boundary (fail-open: null on drift + console.error log, outer JobDetail survives)"
  - "detail.tailored_resume is now a field on JobDetail (LEFT JOIN tailored_resumes tr + TailoredResume interface); Plan 20-05 renders it, Plan 20-06 attaches freshness"
affects:
  - "20-05 (TailoredResumeSection): detail.tailored_resume is the input it renders"
  - "20-06 (attachFreshness integration): freshness enrichment wraps the artifacts parseOrLog produced"
  - "20-08 (schema-drift guardrail): the tr_* columns added here are now part of the expected-column audit"
  - "21 (polish), 22 (salary intel), 23 (regenerate), 24 (silent-success): every future render path inherits the fail-open posture"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "parseOrLog<T>(schema, raw, label, jobId): reusable fail-open wrapper — null/undefined passthrough, console.error on drift, returns null for the nested artifact"
    - "safeParse at the data-access return boundary, NOT at the RSC serialization edge or the component layer"
    - "Each nested artifact validated independently — a cover-letter schema drift does not null out company_research or tailored_resume"

key-files:
  created:
    - "src/lib/jobs-schemas.ts (85 lines): Zod schemas + parseOrLog helper — runtime source of truth for LLM-artifact row shapes"
    - "src/__tests__/lib/jobs-db-zod.test.ts (103 lines): 8 Vitest cases covering valid / missing-field / wrong-type / null / undefined / pathological / tailored_resume-null-model / company_research-nullable"
  modified:
    - "src/lib/jobs-db.ts: added import + TailoredResume interface + tailored_resume field on JobDetail + LEFT JOIN tailored_resumes + tr_* SELECT columns + three parseOrLog calls replacing the imperative artifact builds"

key-decisions:
  - "Log prefix '[jobs-db] <label> schema drift' adopted — greppable across kubectl logs"
  - "parseOrLog signature: z.ZodType<T> generic (not z.ZodSchema<T> from RESEARCH.md snippet) — ZodType is the public v4 type and survives future Zod minor upgrades"
  - "raw null AND undefined both pass through silently — undefined is the common case when row.cl_id is falsy but the builder still creates the object; silent passthrough keeps the log signal clean"
  - "Kept row.cr_salary_currency ?? 'USD' default per CONTEXT.md — its removal is scoped to Phase 22 (salary intelligence defensive render)"
  - "Validated artifacts INDIVIDUALLY (3 parseOrLog calls), not as one nested object — a drift on one artifact does not null out the others. Matches CONTEXT.md D-11 fail-open invariant."

patterns-established:
  - "parseOrLog is the project convention for runtime row validation at DB boundaries — reuse when adding future LLM-artifact queries (Phase 22 salary_intelligence will follow this pattern)"
  - "Zod schemas live in src/lib/*-schemas.ts files, NOT colocated in the DB module — avoids circular imports when DB modules import their schemas"
  - "Console.error with structured payload ({ jobId, issues }) over string concatenation — log tooling can JSON-parse the second argument"

requirements-completed:
  - "AI-SAFETY-06"

# Metrics
duration: 4m
completed: 2026-04-21
---

# Phase 20 Plan 03: Zod safeParse at jobs-db boundary Summary

**Zod safeParse fail-open wrapper (`parseOrLog<T>`) at the `getJobDetail` return boundary for all three LLM artifacts (cover_letter, company_research, tailored_resume), with schema-drift logged as `[jobs-db] <label> schema drift` + jobId + Zod issues array.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-21T18:20:00Z
- **Completed:** 2026-04-21T18:23:59Z
- **Tasks:** 2
- **Files modified:** 3 (1 created schemas file, 1 modified DB module, 1 created test file)

## Accomplishments

- `src/lib/jobs-schemas.ts` created as the runtime source of truth for CoverLetter, CompanyResearch, and TailoredResume row shapes. Exports `parseOrLog<T>(schema, raw, label, jobId): T | null`.
- `getJobDetail()` now flows every nested LLM artifact through `parseOrLog` independently — a drift on one artifact does not null out the others.
- `tailored_resume` is now a first-class field on `JobDetail` (query, interface, parseOrLog build), unblocking Plans 20-05 / 20-06 downstream.
- 8 Vitest cases cover the fail-open invariant (valid → parsed, missing-field → null + log, wrong-type → null + log, null/undefined raw → null silent, pathological input never throws, plus one TailoredResume and one CompanyResearch positive case).
- Full suite 283/283 green (275 baseline + 8 new), production build clean.

## Task Commits

Each task committed atomically:

1. **Task 1: Create jobs-schemas.ts with Zod schemas + parseOrLog helper** — `503b152` (feat)
2. **Task 2: Wire parseOrLog into jobs-db.ts getJobDetail + 8 Zod fail-open tests** — `413eee4` (feat)

**Plan metadata:** [recorded below after final commit]

## Files Created/Modified

- **`src/lib/jobs-schemas.ts` (created, 85 lines)** — Zod schemas mirroring the existing TS interfaces (CoverLetter, CompanyResearch, TailoredResume) + `parseOrLog<T>` helper. Zero dependencies on jobs-db.ts to avoid circular imports.
- **`src/lib/jobs-db.ts` (modified)** — (1) import of schemas + parseOrLog; (2) new `TailoredResume` interface + `tailored_resume: TailoredResume | null` on `JobDetail`; (3) LEFT JOIN `tailored_resumes tr ON tr.job_id = j.id` + `tr_id, tr_content, tr_model_used, tr_generated_at` columns added to SELECT; (4) three imperative artifact builds replaced with `parseOrLog(...)` calls; (5) return block now includes `tailored_resume: tailoredResume`.
- **`src/__tests__/lib/jobs-db-zod.test.ts` (created, 103 lines)** — 8 Vitest cases using `vi.spyOn(console, "error")` to verify the fail-open log contract.

## Decisions Made

- `parseOrLog` accepts `z.ZodType<T>` (the public Zod v4 generic) rather than the RESEARCH.md snippet's `z.ZodSchema<T>` — ZodType is the stable supertype and is the shape the Zod 4 docs recommend for generic helpers.
- Both `null` AND `undefined` raw inputs pass through silently. The plan's checklist only called out `null`, but in practice the caller's builder (`row.cl_id ? {...} : null`) always produces `null`, never `undefined`; supporting both is defensive for future callers.
- Log prefix `[jobs-db] <label> schema drift` chosen to match the convention in existing jobs-db.ts error logs (grep-friendly).
- Kept the `row.cr_salary_currency ?? "USD"` default exactly as-is — its removal is scoped to Phase 22 per CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tailored_resume LEFT JOIN + TailoredResume interface + JobDetail field to jobs-db.ts**

- **Found during:** Task 2 (wire parseOrLog into getJobDetail)
- **Issue:** The plan's Task 2 action lists THREE `parseOrLog` calls including `tailored_resume` (and the acceptance criterion requires `grep -c 'parseOrLog(' === 3`), but the current `jobs-db.ts` contained only two imperative artifact builds (cover_letter + company_research). There was no `tailored_resume` LEFT JOIN, no `tr_*` columns, no `TailoredResume` interface, and no `tailored_resume` field on `JobDetail`. The plan's own description called the work "additive — wrap the existing returns," yet the tailored-resume plumbing that wrap would have wrapped did not exist.
- **Fix:** Added the missing plumbing:
  - `TailoredResume` TS interface (4 fields: `id`, `content`, `model_used: string | null`, `generated_at: string`) — matches the plan's Zod schema exactly.
  - `tailored_resume: TailoredResume | null` field on `JobDetail`.
  - `LEFT JOIN tailored_resumes tr ON tr.job_id = j.id` in the `getJobDetail` query.
  - `tr.id AS tr_id, tr.content AS tr_content, tr.model_used AS tr_model_used, tr.generated_at AS tr_generated_at` columns in the SELECT.
  - `tailored_resume: tailoredResume` in the return object.
  Downstream plan 20-06 already references `detail.tailored_resume` (grep confirmed), so without this fix 20-06's `attachFreshness` wiring would fail to compile.
- **Files modified:** `src/lib/jobs-db.ts`
- **Verification:** `npm test` 283/283 pass; `npm run build` clean; `grep -c 'parseOrLog(' src/lib/jobs-db.ts` === `3`; `grep -c '"tailored_resume"' src/lib/jobs-db.ts` === `1`.
- **Committed in:** `413eee4` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep — the deviation closes a prerequisite gap the plan implicitly assumed. All plan success criteria are now verifiable (the `grep -c 'parseOrLog(' === 3` criterion is only satisfiable if `tailored_resume` is wired, which required the plumbing above).

## Issues Encountered

- `PreToolUse:Edit` hook emitted three false-positive READ-BEFORE-EDIT warnings against `jobs-db.ts` even though the file had been read at the start of the session. The edits applied cleanly and the hook did not block; flagged as a noise-only harness issue, not a work issue.

## User Setup Required

None — no external service configuration required. The schema file is pure TypeScript; tests run against `happy-dom` in Vitest with no DB connection.

## Threat Flags

None — the LEFT JOIN `tailored_resumes` addition expands query surface but stays within the existing `j.id = $1` parameterization (no new injection vector). The new `tailored_resume` return field increases the RSC serialization payload; size is bounded by the `tailored_resumes.content` column (typical LLM output ~3-6 KB) and already has an existing upper bound via `max-h-96 overflow-y-auto` in the render tree planned for 20-05.

## Next Phase Readiness

- **Plan 20-04 (FreshnessBadge + ErrorBoundary):** ready — no dependency on this plan's output
- **Plan 20-05 (TailoredResumeSection + XSS test):** ready — `detail.tailored_resume` is now a first-class field on `JobDetail`
- **Plan 20-06 (job-detail-sheet integration + attachFreshness):** ready — `getJobDetail` now returns all three artifacts validated, `attachFreshness` will receive `CoverLetter | null`, `CompanyResearch | null`, and `TailoredResume | null` exactly as its signature expects
- **Plan 20-08 (schema-drift CI guardrail):** note — the EXPECTED map must include `tailored_resumes` (id, job_id, content, model_used, generated_at), matching what 20-03 now references. Already planned per 20-08's task list.

## Self-Check: PASSED

Created files verified to exist on disk:
- `src/lib/jobs-schemas.ts` FOUND
- `src/__tests__/lib/jobs-db-zod.test.ts` FOUND

Commits verified to exist in git log:
- `503b152` FOUND (Task 1)
- `413eee4` FOUND (Task 2)

Acceptance criteria verified:
- `grep -c 'from "./jobs-schemas"' src/lib/jobs-db.ts` → 1
- `grep -c 'parseOrLog(' src/lib/jobs-db.ts` → 3
- `grep -c '"cover_letter"' src/lib/jobs-db.ts` → 1
- `grep -c '"company_research"' src/lib/jobs-db.ts` → 1
- `grep -c '"tailored_resume"' src/lib/jobs-db.ts` → 1
- `grep -c 'row.cr_salary_currency ?? "USD"' src/lib/jobs-db.ts` → 1
- `npm test` → 283/283 pass (275 baseline + 8 new)
- `npm run build` → clean (no TS errors)

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
