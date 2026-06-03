---
phase: 36-quality-gate
plan: 01
subsystem: testing
tags: [vitest, eslint, tanstack-table, react-compiler, dead-code, quality-gate]

requires:
  - phase: 35-nav-shell
    provides: clean production source with all v5.0 dead identifiers removed
  - phase: 32-site-consolidation
    provides: BlogPost/FamilyUpdate/PostStatus pruning history

provides:
  - "v5.0 Prune Guard test permanently enforcing absence of 6 dead identifiers in production source"
  - "react-hooks/incompatible-library warning suppressed in data-table.tsx with targeted eslint-disable-next-line"
  - "npm run lint: 0 problems (0 errors, 0 warnings) — QUAL-03 lint gate closed"
  - "npm test: 233 passed, 0 failed — QUAL-02 gate confirmed with new guard counted"
  - "npm run build: exit 0, 1036 pages — QUAL-01 gate confirmed"

affects:
  - 36-quality-gate/36-02
  - future phases that edit src/ production source

tech-stack:
  added: []
  patterns:
    - "Recursive pure-Node fs scan for dead-code permanence (no child_process/grep)"
    - "Targeted eslint-disable-next-line at call site with mandatory explanatory comment"

key-files:
  created: []
  modified:
    - src/__tests__/prod-readiness.test.ts
    - src/components/dashboard/data-table.tsx

key-decisions:
  - "Option A (eslint-disable-next-line) chosen over 'use no memo' (Option B) — more targeted, self-documenting, no React Compiler behavior change for rest of component"
  - "Guard added to prod-readiness.test.ts (not a new file) to co-locate with existing source-level structural assertions"
  - "Pure Node fs used in guard test — no child_process/grep — to avoid exit-code-2 false-pass pitfall"
  - "src/__tests__/ excluded from prune guard scan to prevent self-invalidation on nav-footer.test.ts negative assertions"

patterns-established:
  - "Dead-code permanence: add a Vitest describe block with recursive fs scan + identifier array, exclude __tests__ dirs"
  - "Incompatible-library suppressions: explanatory comment block above eslint-disable-next-line, nothing between disable and call"

requirements-completed: [QUAL-01, QUAL-02, QUAL-03]

duration: 8min
completed: 2026-06-03
---

# Phase 36 Plan 01: Quality Gate — Static Gates Summary

**Zero-warning lint gate closed and permanent dead-code prune guard added — all three static quality gates (lint 0, test 233/0, build 1036 pages exit 0) confirmed green**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-03T04:01:00Z
- **Completed:** 2026-06-03T04:09:54Z
- **Tasks:** 3 (2 code changes + 1 verification)
- **Files modified:** 2

## Accomplishments

- Added `describe('v5.0 Prune Guard')` block to `prod-readiness.test.ts` — recursively scans all `.ts`/`.tsx` production source (excludes `__tests__`) using pure Node `fs`, asserts zero matches for 6 dead identifiers: BlogPost, FamilyUpdate, lib/blog, /blog, /family, PostStatus
- Suppressed the single `react-hooks/incompatible-library` ESLint warning in `data-table.tsx` with a targeted `eslint-disable-next-line` at the `useReactTable()` call site; `npm run lint` now reports 0 problems
- Re-confirmed all three static gates: lint 0 problems, 233 tests pass (0 fail), build exit 0 at 1036 pages

## Task Commits

1. **Task 1: v5.0 Prune Guard test** - `dfc3ea3` (test)
2. **Task 2: Lint suppression in data-table.tsx** - `e6e661f` (fix)
3. **Task 3: Gate re-confirmation** — no code changes; verified via gate runs

## Files Created/Modified

- `src/__tests__/prod-readiness.test.ts` - Appended `describe('v5.0 Prune Guard')` block (68 lines); 1 test using recursive pure-Node fs scan excluding `__tests__` dirs
- `src/components/dashboard/data-table.tsx` - Added 5-line explanatory comment block + `eslint-disable-next-line react-hooks/incompatible-library` immediately before `useReactTable()` call (line 45 shifted to ~line 51)

## Gate Results (authoritative)

| Gate | Command | Result |
|------|---------|--------|
| QUAL-03 lint | `npm run lint` | 0 problems (0 errors, 0 warnings) |
| QUAL-02 test | `npm test` | **233 passed**, 0 failed (10 test files) |
| QUAL-01 build | `npm run build` | exit 0, **1036 pages**, no TypeScript errors |

Test count increased from 232 → 233 (the new v5.0 Prune Guard test is counted in the suite total).

## Decisions Made

- **Option A for lint fix:** `eslint-disable-next-line` chosen over `"use no memo"` — more targeted (single call site), self-documenting with mandatory explanatory comment, and does not alter React Compiler behavior for the rest of the component
- **Guard in prod-readiness.test.ts:** Added as a new `describe` block at the end of the existing file rather than creating a new test file — co-locates with the existing source-file structural assertion pattern
- **Pure Node fs for guard:** No `child_process.execSync(grep)` — avoids the exit-code-2 false-pass pitfall where grep error (exit 2) is caught identically to grep no-match (exit 1)
- **Exclude `__tests__` from scan:** `nav-footer.test.ts` contains 6 legitimate negative assertions that include the dead identifier strings; this guard block itself lists the identifiers. Scanning `__tests__` would cause self-invalidation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three static gates confirmed green; Phase 36 Plan 02 (QUAL-04 per-page console sweep) can proceed
- The prune guard is permanent infrastructure — any future edit that re-introduces a pruned identifier will fail `npm test` immediately

---
*Phase: 36-quality-gate*
*Completed: 2026-06-03*
