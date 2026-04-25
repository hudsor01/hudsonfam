---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 02
subsystem: ai-rendering
tags:
  - freshness
  - pure-util
  - vitest
  - hydration-safe
  - zero-dep

# Dependency graph
requires:
  - phase: 20
    plan: 01
    provides: Foundation (npm tree stable under --legacy-peer-deps; test suite baseline 268). No runtime coupling — this plan is pure TypeScript with no streamdown dependency.
provides:
  - isStale(timestamp, thresholdDays, now?) pure util — server-computed freshness, silent-fail on null/invalid input, inclusive at boundary (>=)
  - STALE_THRESHOLDS constant map — cover_letter=14, tailored_resume=14, company_research=60, salary_intelligence=30 (per D-01)
  - ArtifactKind TypeScript type — keyof STALE_THRESHOLDS; used downstream for type-safe lookup
affects:
  - 20-04 (FreshnessBadge + ErrorBoundary) — badge consumes isStale result as a server prop
  - 20-06 (job-detail-sheet integration) — jobs-db server fetch will call isStale per artifact before handing props to client
  - Phase 22 (Salary Intelligence defensive render) — imports STALE_THRESHOLDS.salary_intelligence
  - Phase 24 (Regenerate expansion) — reads timestamps written by regenerate actions; uses this util to decide badge state

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-computed freshness (never on client) — caller computes boolean, passes as prop to client components, preventing hydration mismatch from per-render `new Date()` calls (UI-SPEC §Pattern 2)"
    - "Silent-fail design for defensive rendering — null and unparseable inputs return false instead of throwing, so a malformed DB row never blows up a page render"
    - "Optional `now` injection on date utils for deterministic Vitest coverage — no fake timers needed"
    - "Inclusive boundary (`>=`) for staleness — at exactly the threshold, the artifact is stale; clearer UX than off-by-one"

key-files:
  created:
    - src/lib/job-freshness.ts (48 lines — isStale + STALE_THRESHOLDS + ArtifactKind)
    - src/__tests__/lib/job-freshness.test.ts (43 lines — 7 Vitest cases)
  modified: []

key-decisions:
  - "Zero-dep util — deliberately no date-fns import. Pure epoch-ms math is trivial and keeps this util tree-shakeable. date-fns is reserved for Plan 04's user-facing FreshnessBadge formatting, where its API actually earns its weight."
  - "Silent fallback on both `null` and unparseable timestamps — both paths return false. Rationale: the badge is informational (D-03), never blocks an action. A bad DB row should degrade gracefully to 'no badge' rather than crash the detail sheet."
  - "Inclusive boundary semantics (`ageDays >= thresholdDays`). At exactly 14 days, a cover letter IS stale. This matches intuitive user expectation better than `>` and is called out explicitly in Test 4 to prevent future off-by-one drift."
  - "Named exports only (no default export). Matches the rest of src/lib/."

patterns-established:
  - "Pure util + colocated Vitest test pattern at src/lib/<name>.ts + src/__tests__/lib/<name>.test.ts — mirrors existing structure (dashboard-actions, images, blog)"
  - "Per-artifact threshold constants live with the util that consumes them, not in a separate constants file — callers import one module, not two"

requirements-completed:
  - AI-DATA-03

# Metrics
duration: 1m 19s
completed: 2026-04-21
---

# Phase 20 Plan 02: isStale Util + STALE_THRESHOLDS Summary

**Pure server-side freshness util (`isStale`) plus per-artifact threshold constants (`STALE_THRESHOLDS`) shipped with 7 Vitest cases covering null, fresh, exact-boundary, stale, invalid, and per-artifact threshold independence — 275/275 tests pass (268 baseline + 7 new).**

## Performance

- **Duration:** 1m 19s
- **Started:** 2026-04-21T18:08:38Z
- **Completed:** 2026-04-21T18:09:57Z
- **Tasks:** 1 (TDD RED→GREEN, single atomic commit per plan instruction)
- **Files created:** 2

## Accomplishments

- `isStale(timestamp, thresholdDays, now?)` exported from `src/lib/job-freshness.ts`
  - Signature matches the `<interfaces>` contract in the plan verbatim
  - Defensive: `null` → false; `Number.isNaN(getTime())` → false; never throws
  - Pure: optional `now` Date injection for deterministic tests
  - Inclusive boundary via `>=` operator
- `STALE_THRESHOLDS` constant map with all four D-01 values (cover_letter=14, tailored_resume=14, company_research=60, salary_intelligence=30) exported as a `const` assertion so each threshold narrows to its literal type
- `ArtifactKind` TypeScript type derived from `keyof typeof STALE_THRESHOLDS` — downstream plans can type artifact-kind params without redeclaring the union
- 7 Vitest cases pass (RED confirmed before implementation, then GREEN)
- Full suite: 275/275 passing (baseline was 268; +7 as specified)
- Zero external deps — no date-fns import, no runtime cost beyond a single `Date` construction per call

## Task Commits

Each task was committed atomically:

1. **Task 1: Create job-freshness.ts pure util + threshold constants (TDD RED→GREEN single logical unit)** — `ffc0a69` (feat)

## Files Created/Modified

- `src/lib/job-freshness.ts` (new, 48 lines)
  - JSDoc explains design principles (server-side, silent-fail, pure)
  - `STALE_THRESHOLDS` with `as const` assertion
  - `ArtifactKind` type alias
  - `isStale(timestamp, thresholdDays, now = new Date())` function
- `src/__tests__/lib/job-freshness.test.ts` (new, 43 lines)
  - Single `describe("isStale", ...)` block
  - Fixed reference `now = new Date("2026-04-21T12:00:00Z")` for determinism
  - 7 cases covering all behavior branches listed in `<must_haves.truths>`

## Decisions Made

- **Zero-dep by design.** Considered `date-fns.differenceInDays` but rejected — the arithmetic is `(now - generated) / 86_400_000`, ~one line. Bringing in a formatter lib for one subtraction would add bundle cost and runtime surface for nothing. date-fns is deferred to Plan 04 where its `formatDistanceToNow` is the actual user-facing value-add.
- **Silent-fail over throw.** Both `null` and unparseable strings return false. Alternative was throwing on invalid ISO strings, but: (a) the badge is informational, not gating; (b) a thrown error propagating out of `isStale` would take down the whole detail sheet; (c) downstream Plan 03 Zod safeParse will already catch schema drift at the jobs-db boundary — this util is the last-line defensive layer.
- **Inclusive boundary (`>=`).** Test 4 enforces that at exactly 14 days old, a cover letter IS stale. This matches human intuition ("two weeks old" = "time to refresh") and prevents future contributors from drifting to `>` (which would mean "fresh for 14.0 days, 00:00:00 — stale at 14 days + 1ms").
- **Named exports only.** Matches `src/lib/session.ts`, `src/lib/images.ts`, etc. No default export.
- **Colocated threshold map.** `STALE_THRESHOLDS` lives in the same file as `isStale` rather than a separate `src/lib/constants.ts` — callers make one import, and the threshold values are the util's reason for existing.

## Deviations from Plan

None — plan executed exactly as written. The implementation code and test code were pasted verbatim from the plan's `<action>` block; no Rule 1/2/3 auto-fixes were triggered.

## Issues Encountered

None. The RED step failed as expected (module-not-found error on `@/lib/job-freshness`), the GREEN step passed all 7 cases on first run, and the full 275-test suite passed with no regressions.

Pre-existing uncommitted work in the tree (`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`, `src/lib/job-actions.ts`, `src/lib/jobs-db.ts`) was untouched — these 3 files remained dirty at plan start and are still dirty at plan end. They do not intersect with this plan's 2-file scope. Sequential-executor instructions explicitly mandated leaving them alone.

## User Setup Required

None — pure internal utility module, no env vars, no external services, no dashboard changes.

## Next Phase Readiness

- **Plan 20-03 (Zod safeParse at jobs-db boundary) unblocked** — will import no symbols from this plan, but the two plans share the "defensive at the data layer" philosophy.
- **Plan 20-04 (FreshnessBadge + ErrorBoundary) unblocked** — will `import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness"` and compute the boolean server-side before passing to the badge client component. date-fns usage lands here.
- **Plan 20-06 (job-detail-sheet integration) unblocked** — the jobs-db server fetch layer will call `isStale(generatedAt, STALE_THRESHOLDS[artifactKind])` once per artifact and hand the resulting boolean to the detail-sheet props.

## Self-Check: PASSED

- [x] `src/lib/job-freshness.ts` exists — verified via `test -f`
- [x] `src/__tests__/lib/job-freshness.test.ts` exists — verified via `test -f`
- [x] `grep -c 'export function isStale' src/lib/job-freshness.ts` = 1 — verified
- [x] `grep -c 'export const STALE_THRESHOLDS' src/lib/job-freshness.ts` = 1 — verified
- [x] Four threshold literals present (cover_letter: 14, tailored_resume: 14, company_research: 60, salary_intelligence: 30) — verified
- [x] Three top-level exports (isStale, STALE_THRESHOLDS, ArtifactKind) — verified (count = 3)
- [x] Zero `date-fns` references in `src/lib/job-freshness.ts` — verified (count = 0)
- [x] `npm test -- job-freshness` → 7/7 passing — verified
- [x] Full suite `npm test` → 275/275 passing — verified (baseline 268 + 7 new)
- [x] Commit `ffc0a69` present in git log — verified (`git log --oneline | grep ffc0a69`)
- [x] Commit contains only 2 files (src/lib/job-freshness.ts, src/__tests__/lib/job-freshness.test.ts) — verified via `git show --stat ffc0a69`
- [x] Pre-existing dirty files (job-detail-sheet.tsx, job-actions.ts, jobs-db.ts) untouched — verified via `git status --short`

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
