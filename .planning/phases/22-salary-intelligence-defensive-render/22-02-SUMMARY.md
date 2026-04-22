---
phase: 22-salary-intelligence-defensive-render
plan: 02
subsystem: data-layer
tags:
  - sql
  - lateral-join
  - salary-intelligence
  - jobs-db
  - attach-freshness
  - tri-field-dispatch

dependency_graph:
  requires:
    - phase: 22-salary-intelligence-defensive-render
      provides: "SalaryIntelligenceSchema (from Plan 22-01)"
  provides:
    - "SalaryIntelligence TS interface (jobs-db.ts)"
    - "JobDetail.salary_intelligence field"
    - "FreshJobDetail.salary_intelligence field (freshness-wrapped)"
    - "LEFT JOIN LATERAL (salary_intelligence WHERE FALSE) skeleton"
    - "parseOrLog(SalaryIntelligenceSchema) wiring at DB boundary"
    - "attachFreshness tri-field dispatcher (generated_at / search_date / created_at)"
    - "fetchJobDetail salary_intelligence freshness attachment (30-day threshold)"
  affects:
    - src/lib/jobs-db.ts
    - src/lib/attach-freshness.ts
    - src/lib/job-actions.ts
    - "Plan 22-03 (salary_currency ?? \"USD\" removal — same file, serialized wave)"
    - "Plan 22-06 (salary-intelligence-section component — consumes the new type)"

tech_stack:
  added: []
  patterns:
    - "LEFT JOIN LATERAL with WHERE FALSE as a zero-match skeleton (D-03) — tolerates zero rows today AND tolerates future column-shape via 1-line predicate tighten"
    - "Seven si_* aliased columns parallel the cl_/cr_/tr_ analogs (same cadence as existing LEFT JOINs at lines 312-314)"
    - "parseOrLog(SalaryIntelligenceSchema, ...) independent of cover_letter / company_research / tailored_resume — D-02 invariant (schema drift on one artifact never nulls out the others)"
    - "attachFreshness tri-field dispatch: priority order generated_at → search_date → created_at (falls through for backwards-compat)"

key_files:
  created: []
  modified:
    - src/lib/jobs-db.ts
    - src/lib/attach-freshness.ts
    - src/lib/job-actions.ts
    - src/__tests__/lib/attach-freshness.test.ts

decisions:
  - "LEFT JOIN LATERAL uses WHERE FALSE predicate (D-03): returns zero rows regardless of salary_intelligence table contents. Tolerates the current no-job-id-no-company-name reality AND whatever upstream shape lands post-n8n-task-11 (1-line predicate tighten)."
  - "SalaryIntelligence interface uses report_json: unknown (matches SalaryIntelligenceSchema.report_json: z.unknown()) — deliberate permissive passthrough per D-01 until upstream stabilizes."
  - "FreshJobDetail extends Omit<JobDetail, ... | \"salary_intelligence\"> — adds salary_intelligence to the Omit union exactly as cover_letter/tailored_resume/company_research do."
  - "Tri-field attachFreshness dispatch order: generated_at first (preserves cover_letter/tailored_resume), then search_date (NEW — salary_intelligence), then created_at fall-through (preserves company_research). Byte-identical behavior for existing callers."
  - "Phase 22 D-01 threshold (30 days for salary_intelligence, already declared in job-freshness.ts:22) consumed at fetchJobDetail call site — no new threshold additions."
  - "?? \"USD\" at jobs-db.ts:379 RETAINED — its removal is Plan 22-03's scope (D-12 cascade; same file, serialized wave)."

patterns_established:
  - "Defensive LEFT JOIN LATERAL skeleton pattern: (SELECT ... FROM <table> <alias> WHERE FALSE ORDER BY <pk> DESC LIMIT 1) — use when upstream data exists but join predicate is TBD. Zero operational risk today; predicate swap is 1 line post-upstream-fix."
  - "Tri-field (and generalized N-field) attachFreshness dispatch: add a new `\"fieldname\" in artifact` branch BEFORE the fall-through to preserve existing caller precedence. Test coverage MUST include a \"both fields present → earlier field wins\" case."

requirements-completed:
  - AI-DATA-01
  - AI-DATA-02

metrics:
  duration: "~4 minutes"
  completed_date: "2026-04-22"
  tests_before: 424
  tests_after: 427
  tests_added: 3
  task_count: 5
  file_count: 4
---

# Phase 22 Plan 02: Salary Intelligence Defensive Render — Data Layer + Freshness Summary

**Defensive `LEFT JOIN LATERAL salary_intelligence WHERE FALSE` skeleton + `SalaryIntelligence` TS interface + tri-field `attachFreshness` dispatcher (generated_at / search_date / created_at) — getJobDetail now returns salary_intelligence: null for every job today, ready for upstream n8n task #11 data via a 1-line predicate swap.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-22T20:15:13Z
- **Completed:** 2026-04-22T20:19:22Z
- **Tasks:** 5 (4 code + 1 commit)
- **Files modified:** 4

## Accomplishments

- **AI-DATA-01 (data layer skeleton):** `getJobDetail()` in `src/lib/jobs-db.ts` gained 7 aliased `si_*` columns + `LEFT JOIN LATERAL (SELECT ... FROM salary_intelligence si WHERE FALSE ORDER BY search_date DESC LIMIT 1) si ON TRUE`. Zero rows matched today per D-03; upstream predicate tighten is 1 line.
- **AI-DATA-02 (type contract):** `SalaryIntelligence` TS interface exported (7 fields matching live-DB column types). `JobDetail` and `FreshJobDetail` extended with `salary_intelligence` field (nullable + freshness-wrapped respectively). `parseOrLog(SalaryIntelligenceSchema, ...)` wired at the return boundary following the tailored_resume analog (lines 362-376).
- **Tri-field attachFreshness dispatch:** `src/lib/attach-freshness.ts` generic constraint broadened to `{ generated_at } | { created_at } | { search_date }`; dispatcher adds a `"search_date" in artifact` branch between the existing `generated_at` and `created_at` branches. Existing 5 frozen-clock tests stay green (byte-identical behavior for cover_letter / tailored_resume / company_research).
- **fetchJobDetail wiring:** `src/lib/job-actions.ts` adds `attachFreshness<SalaryIntelligence>(detail.salary_intelligence, STALE_THRESHOLDS.salary_intelligence)` in the return object. 30-day threshold consumed from the already-declared `STALE_THRESHOLDS.salary_intelligence` (no new threshold additions).
- **Test coverage delta:** 3 new cases in `src/__tests__/lib/attach-freshness.test.ts` — (1) dispatches on search_date when only search_date + created_at present; (2) prefers generated_at over search_date when both present; (3) falls through to created_at when only created_at present. Test suite 424 → 427 green.

## Task Commits

1. **Task 22-02-01** (Extend getJobDetail with LEFT JOIN LATERAL + SalaryIntelligence interface + parseOrLog wiring) — **bundled into 603b1a1**
2. **Task 22-02-02** (Extend attachFreshness to tri-field dispatcher) — **bundled into 603b1a1**
3. **Task 22-02-03** (Wire attachFreshness call for salary_intelligence in fetchJobDetail) — **bundled into 603b1a1**
4. **Task 22-02-04** (Add attachFreshness search_date dispatch test) — **bundled into 603b1a1**
5. **Task 22-02-05** (Commit) — `603b1a1` **feat(22-02): LEFT JOIN LATERAL salary_intelligence (WHERE FALSE skeleton) + SalaryIntelligence type + tri-field attachFreshness (AI-DATA-01 + AI-DATA-02; D-03)**

_Note: Tasks 1-4 were cross-file-coupled (Task 1's JobDetail/FreshJobDetail extension creates a TS error in job-actions.ts that only resolves after Task 3 wires the attachFreshness<SalaryIntelligence> call). The plan explicitly mandated a single combined commit in Task 22-02-05 covering all 4 source files._

**Plan metadata:** Final commit (docs: complete plan) follows after STATE.md + ROADMAP.md + REQUIREMENTS.md updates.

## Files Modified

- **`src/lib/jobs-db.ts`** — imports `SalaryIntelligenceSchema`; exports `SalaryIntelligence` interface (7 fields); `JobDetail` + `FreshJobDetail` extended; SQL SELECT gains 7 `si_*` aliased columns + `LEFT JOIN LATERAL ... WHERE FALSE ... LIMIT 1` block; return path adds `salaryIntelligence = parseOrLog(SalaryIntelligenceSchema, ...)` and appends `salary_intelligence: salaryIntelligence` to the return object. `?? "USD"` at line 379 untouched (Plan 22-03 scope).
- **`src/lib/attach-freshness.ts`** — generic type constraint extended to three-field union; JSDoc reworded to describe tri-field dispatch; dispatcher adds `"search_date" in artifact` branch between the existing `generated_at` and `created_at` branches.
- **`src/lib/job-actions.ts`** — `type { SalaryIntelligence }` added to the existing `@/lib/jobs-db` type import block; `fetchJobDetail` return object adds `salary_intelligence: attachFreshness<SalaryIntelligence>(detail.salary_intelligence, STALE_THRESHOLDS.salary_intelligence)`. JSDoc updated with a fourth freshness-threshold bullet.
- **`src/__tests__/lib/attach-freshness.test.ts`** — new `describe("attachFreshness — tri-field dispatch (Phase 22 extension)")` block with 3 frozen-clock cases (FROZEN_NOW = 2026-04-22T12:00:00Z). Existing 5 tests untouched.

## Decisions Made

All decisions were mandated by Plan 22-02 + CONTEXT.md D-01/D-02/D-03 and required zero on-the-fly judgment:

1. **LEFT JOIN LATERAL + WHERE FALSE skeleton (D-03)** — zero rows today, 1-line tighten later. No performance risk (LATERAL short-circuits on WHERE FALSE).
2. **SalaryIntelligence.report_json: unknown** — matches SalaryIntelligenceSchema's z.unknown() (D-01 permissive posture).
3. **Tri-field dispatch order: generated_at → search_date → created_at** — preserves existing caller precedence byte-identically; new branch inserted between the two existing branches.
4. **?? "USD" retained** — explicitly deferred to Plan 22-03 per D-12 cascade. Attempting to remove it here would collide with Plan 22-03's scope and break the serialized wave ordering.
5. **Single combined commit (Task 22-02-05) rather than per-task commits** — explicitly mandated by the plan because Tasks 1-3 create a cross-file TS type mismatch that only clears once all three are applied together. Task 22-02-04 (tests) joins the same commit to keep the atomic unit green.

## Deviations from Plan

### Test fixture expected-value correction

**1. [Rule 1 - Bug in test fixture]** Plan text specified `expect(result!.freshness.generatedDate).toBe("4/21/26")` for the "dispatches on search_date" case — but `search_date: "2026-04-21T00:00:00Z"` renders as `4/20/26` in America/Chicago (CDT = UTC-5, so 2026-04-21 00:00 UTC = 2026-04-20 19:00 Chicago).
- **Found during:** Task 22-02-04 (first test run — all 3 new cases failed the generatedDate assertion).
- **Fix:** Corrected the expected value to `"4/20/26"` (which is the correct Intl.DateTimeFormat(America/Chicago) output for the 2026-04-21T00:00:00Z input, per existing attach-freshness.test.ts precedent — Plan 20-06 case at line 66 handles the same DST-edge identically).
- **Files modified:** `src/__tests__/lib/attach-freshness.test.ts` (only — no production change).
- **Verification:** All 3 new tri-field cases pass; all 5 existing cases stay green; total 8/8 in the file.
- **Committed in:** 603b1a1 (part of Task 22-02-05 bundle).

Similarly for the "prefers generated_at" case — plan expected `"4/21/26"` (Chicago TZ conversion of `2026-04-22T00:00:00Z` = 2026-04-21 19:00 CDT → 4/21/26 in M/D/YY), which matched correctly. The plan's guidance to "accept either 4/21/26 or 4/22/26" was handled by asserting `4/21/26` exactly (the correct value) rather than using a loose contains-check.

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's expected-value fixture, not in production code).
**Impact on plan:** Zero production-logic change. The Chicago-TZ fixture value was wrong in the plan text; the production code + test logic are correct. This is identical to how Plan 20-06's existing "created_at for company_research" test handled the same TZ edge (line 61-67, `2026-04-21T05:00:00.000Z` renders as `4/21/26` because 05:00 UTC is already past midnight Chicago).

## Issues Encountered

- **Cross-file TS coupling on Task 1 vs Task 3:** The plan's Task 22-02-01 verify uses `npm run build`, but adding `salary_intelligence: SalaryIntelligence | null` to `FreshJobDetail` creates a TS error in `fetchJobDetail` (the spread `...detail` passes the raw `SalaryIntelligence` through where the type now demands `SalaryIntelligence & { freshness }`). This is expected — Tasks 1-3 must land together for the build to pass. The plan's Task 22-02-05 explicitly bundles all 4 files into a single commit, which is the correct atomic unit. Proceeded through Tasks 2 + 3 before re-running `npm run build` for final verification (exit 0).

## Next Phase Readiness

- **Plan 22-03 unblocked:** Same file (`src/lib/jobs-db.ts`) edit — `?? "USD"` removal at line 379. Serialized wave sequencing per phase plan; Plan 22-02 left that line untouched as required.
- **Plan 22-06 unblocked:** `SalaryIntelligence` + `FreshJobDetail.salary_intelligence` types exported; salary-intelligence-section component can consume directly.
- **Upstream dependency:** Zero rows matched today because `WHERE FALSE` is permanent until n8n task #11 ships real `salary_intelligence.company_name` or `salary_intelligence.report_json->>'company_name'` data. The predicate swap is 1 line when upstream stabilizes — no type or test churn required.
- **No deferrals:** All 4 files complete; test suite green; build exits 0.

## Self-Check: PASSED

**Files verified present:**
- `src/lib/jobs-db.ts` — FOUND (contains `LEFT JOIN LATERAL`, `WHERE FALSE`, `ORDER BY search_date DESC`, `LIMIT 1`, `export interface SalaryIntelligence`, `SalaryIntelligenceSchema` × 2).
- `src/lib/attach-freshness.ts` — FOUND (tri-field constraint + `"search_date" in artifact` dispatch).
- `src/lib/job-actions.ts` — FOUND (`attachFreshness<SalaryIntelligence>`, `STALE_THRESHOLDS.salary_intelligence`).
- `src/__tests__/lib/attach-freshness.test.ts` — FOUND (`tri-field dispatch` describe block, 3 new passing cases).

**Commits verified:**
- `603b1a1` — FOUND in `git log`.

**Verification commands:**
- `npm run build` → exit 0.
- `npm test -- --run` → 427/427 green.
- `npm test -- --run src/__tests__/lib/attach-freshness.test.ts` → 8/8 green.
- `npm test -- --run src/__tests__/lib/jobs-db-zod.test.ts` → 27/27 green.

---
*Phase: 22-salary-intelligence-defensive-render*
*Completed: 2026-04-22*
