---
phase: 22-salary-intelligence-defensive-render
plan: 01
subsystem: data-layer
tags:
  - zod
  - schema
  - salary-intelligence
  - fail-open
  - d-12-cascade

dependency_graph:
  requires: []
  provides:
    - SalaryIntelligenceSchema
    - "CompanyResearchSchema.salary_currency (nullable)"
    - "CompanyResearch.salary_currency (TS interface, nullable)"
  affects:
    - src/lib/jobs-schemas.ts
    - src/lib/jobs-db.ts
    - src/__tests__/lib/jobs-db-zod.test.ts

tech_stack:
  added: []
  patterns:
    - "Zod fail-open at DB boundary (Plan 20-03 precedent, extended to third artifact)"
    - "Permissive `z.unknown()` for upstream-in-flux JSONB column (D-01)"
    - "TS interface slaved to Zod z.infer-style type (source-of-truth posture)"

key_files:
  created: []
  modified:
    - src/lib/jobs-schemas.ts
    - src/lib/jobs-db.ts
    - src/__tests__/lib/jobs-db-zod.test.ts

decisions:
  - "SalaryIntelligenceSchema: 7-field Zod object with permissive report_json: z.unknown() per D-01 — zero live rows today, upstream n8n task #11 not yet shipped, broad shape accepts whatever lands."
  - "CompanyResearchSchema.salary_currency flipped from z.string() to z.string().nullable() per D-12 — unblocks Plan 22-03's ?? 'USD' removal cascade."
  - "CompanyResearch TS interface in jobs-db.ts flipped salary_currency: string → string | null — Rule 1 auto-fix to keep build green; Zod schema is now authoritative (Plan 20-03 source-of-truth convention)."
  - "No parseOrLog changes needed — existing generic z.ZodType<T> signature handles SalaryIntelligenceSchema natively."

metrics:
  duration: "~4 minutes"
  completed_date: "2026-04-22"
  tests_before: 395
  tests_after: 410
  tests_added: 15
  task_count: 3
  file_count: 3
---

# Phase 22 Plan 01: Salary Intelligence Defensive Render — Data Layer Skeleton Summary

**One-liner:** Permissive `SalaryIntelligenceSchema` added to `jobs-schemas.ts` + `CompanyResearchSchema.salary_currency` flipped nullable, preparing the Zod boundary for Phase 22's defensive renderer while the n8n upstream workflow is still in flux.

## What Shipped

### Zod schema extensions (`src/lib/jobs-schemas.ts`)
- **New:** `SalaryIntelligenceSchema` — 7-field `z.object({ id, search_date, report_json, raw_results, llm_analysis, created_at, updated_at })` appended between `TailoredResumeSchema` and `parseOrLog`. `report_json: z.unknown()` is deliberately permissive (D-01) until n8n task #11 produces the first real row. `raw_results`, `llm_analysis`, and `updated_at` are `.nullable()` to match live-DB types.
- **Modified:** `CompanyResearchSchema.salary_currency` flipped from `z.string()` to `z.string().nullable()` per D-12 — cascade prep for Plan 22-03's `?? "USD"` default removal (when `salary_currency` is null, the salary block hides entirely rather than mislabeling non-USD figures with a `$`).
- **Unchanged:** `parseOrLog<T>` function body is byte-identical — its generic `z.ZodType<T>` signature inherits the fail-open posture with no new infrastructure.

### TS interface alignment (`src/lib/jobs-db.ts`)
- **Modified:** `CompanyResearch.salary_currency: string` → `string | null` — Rule 1 auto-fix to match the now-authoritative Zod schema and keep `npm run build` green (see Deviations below).
- **Unchanged:** `cr_salary_currency ?? "USD"` default at line 349 is explicitly retained — its removal is Plan 22-03's scope (D-12).

### Fail-open test coverage (`src/__tests__/lib/jobs-db-zod.test.ts`)
Two new `describe` blocks added after the existing `TailoredResumeSchema` tests:

1. **`SalaryIntelligenceSchema — fail-open validation at DB boundary`** (13 cases):
   - Valid 7-field row parses successfully
   - Missing `search_date` → `parseOrLog` returns null + logs `[jobs-db] salary_intelligence schema drift` with `jobId: 42`
   - `it.each` permissive matrix — 8 cases covering `report_json` as `null` / `number` / `string` / `{}` / `[]` / unknown-shape / MIN_MEDIAN_MAX shape / PERCENTILES shape (all parse successfully per D-01)
   - `llm_analysis: null` accepted
   - `raw_results: null` accepted
   - `parseOrLog(…, null, …)` returns null silently (no `console.error` call)

2. **`CompanyResearchSchema — salary_currency nullable cascade (D-12)`** (2 cases):
   - `salary_currency: null` now accepted (Phase 22 D-12 cascade)
   - `salary_currency: "USD"` still accepted (no regression to existing fixtures)

## Test Count Delta

- **Before:** 395 tests green (post-Plan 21-06 baseline)
- **After:** 410 tests green (+15)
- **File-level:** `src/__tests__/lib/jobs-db-zod.test.ts` went from 12 → 27 cases (it.each expands the 8 report_json permissive cases into 8 distinct Vitest cases)
- **Full suite:** 27 test files, 410 tests, 3.41s duration

## Deviations from Plan

### Rule 1 — Auto-fixed type drift between Zod schema and TS interface

**Found during:** `npm run build` verification gate after GREEN phase

**Issue:** The plan's action steps for Task 22-01-01 listed only `src/lib/jobs-schemas.ts` modifications. However, flipping `CompanyResearchSchema.salary_currency` to `.nullable()` broke the TS build because `CompanyResearch` interface in `src/lib/jobs-db.ts:67` still declared `salary_currency: string`. TypeScript error surfaced at the `getJobDetail` return:
```
Type 'string | null' is not assignable to type 'string'.
Type 'null' is not assignable to type 'string'.
```
This violates the plan's own success criteria ("Zero TS compilation errors") and the Plan 20-03 source-of-truth posture (Zod schema is authoritative; TS interfaces in `jobs-db.ts` are kept source-compatible by hand).

**Fix:** Flipped `CompanyResearch.salary_currency: string` → `string | null` on line 67 of `src/lib/jobs-db.ts`. Zero runtime behavior change — the `?? "USD"` default at line 349 still guarantees a string value flows to the type-annotated return shape (the null-propagation happens ONLY through the Zod-parsed path post-Plan-22-03, not this plan). This keeps Plan 22-03's scope clean (Plan 22-03 removes the `?? "USD"` default; Plan 22-01 just makes the interface accept what the Zod schema now emits).

**Files modified:** `src/lib/jobs-db.ts` (1-line change)

**Commit:** `e6b2d82` (bundled with the schema + test edits)

**Result of deviation:** Commit acceptance criterion "exactly 2 files" now shows 3 files (`src/lib/jobs-schemas.ts`, `src/lib/jobs-db.ts`, `src/__tests__/lib/jobs-db-zod.test.ts`). The deviation is correctness-driven — the alternative (leaving the build broken for Plan 22-02 to fix) would violate this plan's own success criteria and the GSD rule that each plan must leave the tree green.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`), but individual tasks were marked `tdd="true"`. TDD cycle was observed for the schema change:

- **RED:** Added 15 new test cases referencing `SalaryIntelligenceSchema` + `CompanyResearchSchema` null-currency; ran `vitest` → 13 failures, all for the right reasons (`SalaryIntelligenceSchema undefined`, `CompanyResearchSchema.safeParse({salary_currency: null}).success === false`).
- **GREEN:** Added `SalaryIntelligenceSchema` + flipped `CompanyResearchSchema.salary_currency` to `.nullable()` + applied the Rule 1 TS interface fix; ran `vitest` → 410/410 green.
- **REFACTOR:** Not needed — schema definition is minimal and final.

Single commit (`e6b2d82`) contains both the failing tests and the GREEN implementation because the two tasks share atomic-commit scope per Plan 22-01 Task 22-01-03. This is acceptable GSD per the `feat(…)` commit convention for a single-plan implementation (separate `test:` + `feat:` commits would split one atomic unit across two refs).

## Grep-Verifiable Acceptance Criteria

All acceptance criteria from the plan verified:

```
$ grep -n "export const SalaryIntelligenceSchema" src/lib/jobs-schemas.ts
66:export const SalaryIntelligenceSchema = z.object({       ← exactly 1 match ✓

$ grep -n "report_json: z.unknown()" src/lib/jobs-schemas.ts
69:  report_json: z.unknown(),                              ← exactly 1 match (inside schema block) ✓

$ grep -n "salary_currency: z.string().nullable()" src/lib/jobs-schemas.ts
37:  salary_currency: z.string().nullable(),                ← exactly 1 match ✓

$ grep -n "salary_currency: z.string()," src/lib/jobs-schemas.ts
(zero matches — old non-nullable version removed)            ← 0 matches ✓

$ grep -n "search_date: z.string()" src/lib/jobs-schemas.ts
68:  search_date: z.string(),                               ← exactly 1 match ✓

$ grep -n "llm_analysis: z.string().nullable()" src/lib/jobs-schemas.ts
71:  llm_analysis: z.string().nullable(),                   ← exactly 1 match (inside schema) ✓

$ grep -n "export function parseOrLog<T>" src/lib/jobs-schemas.ts
92:export function parseOrLog<T>(                           ← exactly 1 match, unchanged ✓
```

## Requirements Addressed

- **AI-DATA-02** — partially satisfied. The Zod schema + inferred type shape are now in place. Plan 22-02 picks up with the `JobDetail.salary_intelligence` field + `LEFT JOIN LATERAL` SQL shape + `parseOrLog(SalaryIntelligenceSchema, …)` call site in `getJobDetail`.

## Handoff to Plan 22-02

Plan 22-02 (next in Wave 1) imports `SalaryIntelligenceSchema` from `src/lib/jobs-schemas` and wires it into `src/lib/jobs-db.ts`:

1. Extends `JobDetail` interface with `salary_intelligence: SalaryIntelligence | null`
2. Adds the `LEFT JOIN LATERAL (SELECT * FROM salary_intelligence WHERE FALSE ORDER BY search_date DESC LIMIT 1) si ON TRUE` subquery to the `getJobDetail` SELECT
3. Adds the `parseOrLog(SalaryIntelligenceSchema, row.si_id ? {...} : null, "salary_intelligence", jobId)` call + splices it into the returned `JobDetail`
4. Exports `SalaryIntelligence` as a TS interface (or `type` derived via `z.infer<typeof SalaryIntelligenceSchema>`) per Plan 22-02's final posture

The `?? "USD"` default at line 349 is **left intact** this plan; Plan 22-03 removes it (D-12 cascade).

## Threat Flags

None introduced. The `report_json: z.unknown()` looseness is explicitly documented in the T-22-01-01 threat register entry as a `mitigate` disposition — downstream XSS is handled by Streamdown `skipHtml` in Plan 22-06.

## Known Stubs

None. This plan ships runtime validation infrastructure only — no UI surface, no hardcoded empty values.

## Self-Check: PASSED

- [x] `src/lib/jobs-schemas.ts` exists and contains `SalaryIntelligenceSchema` (line 66)
- [x] `src/lib/jobs-schemas.ts` contains `salary_currency: z.string().nullable()` (line 37)
- [x] `src/lib/jobs-db.ts` `CompanyResearch.salary_currency` is `string | null` (line 67)
- [x] `src/__tests__/lib/jobs-db-zod.test.ts` imports `SalaryIntelligenceSchema`
- [x] Commit `e6b2d82` exists in `git log --oneline`
- [x] `npm test -- --run src/__tests__/lib/jobs-db-zod.test.ts` exits 0 (27/27 cases green)
- [x] `npm test -- --run` full suite exits 0 (410/410 green)
- [x] `npm run build` exits 0 (TypeScript clean; only pre-existing Redis / Better Auth / NFT warnings)
