---
phase: 24-regenerate-expansion-resume-salary-silent-success-state
plan: "01"
subsystem: ui
tags: [react, vitest, typescript, state-machine, polling, discriminated-union, tdd, testing-library]

# Dependency graph
requires:
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: regenerate-cover-letter-button.tsx state machine + 17-case test suite + G-1/G-2/G-6 grep gates + ErrorSentinel 4-value union + fetchJobDetail polling client + fake-timer test scaffold
  - phase: 22-salary-intelligence-defensive-render
    provides: salary_intelligence.search_date schema truth (date, not timestamp) + text-warning token consumer precedent (ProvenanceTag)
  - phase: 20-job-detail-sheet-extraction
    provides: FreshJobDetail type + SectionErrorBoundary wrappers (cover_letter, tailored_resume, salary_intelligence)
provides:
  - RegenerateButton generalized 4-state component (idle | in-progress | error | silent-success) consumed by cover_letter + tailored_resume + salary_intelligence instantiations
  - coverLetterIsDone / tailoredResumeIsDone / salaryIntelligenceIsDone pure predicate exports
  - silent-success warning UX primitive (AI-ACTION-07) — verbatim SC #3 copy with em-dash U+2014
  - 4 grep gates on the shared component (G-1, G-2, G-6 extended, G-8 NEW) enforced via readFileSync source inspection
  - Fixture-helper test pattern (renderCoverLetter / renderTailoredResume / renderSalaryIntelligence) reusable by plans 24-02 / 24-03 section tests
affects: [24-02 (imports RegenerateResult type shape + action prop contract), 24-03 (consumes RegenerateButton + 3 predicates as mount dependencies), 24-04 (phase-level requirements closure)]

# Tech tracking
tech-stack:
  added: []  # zero new deps — RegenerateButton reuses shadcn Button + lucide Loader2/RefreshCw from Phase 23; regenerate-predicates is pure TypeScript
  patterns:
    - "Discriminated-union state machine with mutually-exclusive terminal variants (error | silent-success) enforced via type narrowing, not runtime flags"
    - "Server-injected action prop pattern (D-01): generalized components receive their Server Action as a prop, preserving type safety while enabling multi-artifact reuse"
    - "Pure predicate extraction to @/lib/*-predicates.ts: pattern-matches score-color.ts / empty-state-copy.ts / format-salary.ts conventions; enables isolated Vitest coverage without component render"
    - "G-8 verbatim-copy lock pattern: source-grep (exact count = 1) + DOM assertion on state transition — two-prong enforcement catches both coding-time and test-only drift"
    - "Fake-timer 60-poll exhaustion loop: for (let i = 0; i < 60; i++) { await act(async () => await vi.advanceTimersByTimeAsync(3000)) }"

key-files:
  created:
    - "src/lib/regenerate-predicates.ts — 3 pure isDone predicate exports (coverLetterIsDone, tailoredResumeIsDone, salaryIntelligenceIsDone) with UTC-midnight date parse for salary_intelligence"
    - "src/__tests__/lib/regenerate-predicates.test.ts — 21 contract test cases (null handling, exact-baseline boundary, strict greater-than, INSERT-wait null-baseline fallback, date-granular same-day edge)"
  modified:
    - "src/app/(admin)/admin/jobs/regenerate-button.tsx — RENAMED from regenerate-cover-letter-button.tsx; generalized props (D-01); 4-state machine (D-06); silent-success render branch (D-05)"
    - "src/__tests__/components/regenerate-button.test.tsx — RENAMED from regenerate-cover-letter-button.test.tsx; 17 Phase 23 cases ported with renderCoverLetter fixture; 5 tailored_resume cases; 5 salary_intelligence cases (incl. same-day rough-edge test); 4 grep-gate assertions"

key-decisions:
  - "Predicates EXTRACTED to src/lib/regenerate-predicates.ts (UI-SPEC recommendation honored) rather than inlined in the component — pattern-matches score-color.ts / empty-state-copy.ts / format-salary.ts; enables isolated coverage without component render"
  - "Silent-success state stays-until-clicked (no auto-revert timer) — matches sentinel-error UX; simpler than timer-based transition; owner may be looking away when cap is reached"
  - "Unused `artifact` prop accepted via `void _artifact` suppression — keeps D-01 props contract discoverable + enables future per-artifact icon swaps without breaking callsites"
  - "60-poll cap-exit ALSO transitions to silent-success in the .catch branch (not just .then) — in-progress state is only reachable after ok:true, so both exits share the same disposition (RESEARCH Pitfall 2 / PATTERNS §1)"
  - "baselineGeneratedAt widened to string | null (D-01) — accommodates INSERT-wait case where server returns baseline:null; predicate `serverBaseline === null` branch returns true when artifact row exists (any row is progress)"
  - "salaryIntelligenceIsDone uses `new Date(current + 'T00:00:00Z').getTime()` UTC-midnight parse — avoids TZ drift across browser locales; date-granular comparison documented as known rough edge (same-day regenerate → silent-success)"

patterns-established:
  - "Pattern: 4-state discriminated-union polling-button with server-injected action/predicate props — reusable for future LLM regenerate surfaces (e.g., regenerate match_score when that artifact ships)"
  - "Pattern: G-8 verbatim-copy two-prong gate (source-grep exact-count + DOM-assertion) — apply to any owner-committed copy lock where drift silently degrades UX contract"
  - "Pattern: Pure-predicate file colocated with component that consumes it (src/lib/{feature}-predicates.ts) — enables independent Vitest coverage and future UI-SPEC enforcement of 'no wall-clock reads in the component, ISO parsing permitted in predicates'"

requirements-completed: []  # Plan 24-01 lays the foundation for AI-ACTION-05/06/07 but does NOT functionally complete them — requires Plan 24-02 (Server Actions) + Plan 24-03 (mounts) to be user-facing. Phase-level closure happens in Plan 24-04.

# Metrics
duration: ~8min
completed: 2026-04-23
---

# Phase 24 Plan 01: Generalize regenerate-button + predicates + 4-state machine + silent-success Summary

**Renamed regenerate-cover-letter-button.tsx → regenerate-button.tsx with generalized props (artifact/label/action/isDone), extended state machine from 3 to 4 variants (adding silent-success per D-06), extracted 3 pure isDone predicates to src/lib/regenerate-predicates.ts, and ported 17 Phase 23 cases + 15 new cases (tailored_resume, salary_intelligence, silent-success verbatim-copy, same-day date-granular rough-edge) while preserving G-1/G-2/G-3/G-6 gates and adding G-8 copy-lock.**

## Performance

- **Duration:** ~8 min (first RED commit 14:48:05Z → final GREEN commit 14:53:34Z)
- **Started:** 2026-04-23T14:48:05Z (test commit for regenerate-predicates RED)
- **Completed:** 2026-04-23T14:53:34Z (component GREEN commit)
- **Tasks:** 3 (all TDD: Task 1 predicates, Task 2 component rename+generalize, Task 3 test file rename+port+extend)
- **Files modified:** 4 (2 created: regenerate-predicates.ts + regenerate-predicates.test.ts; 2 renamed-with-content-change: regenerate-button.tsx + regenerate-button.test.tsx)

## Accomplishments

- **Generalized RegenerateButton component** — single source of truth for all 3 regenerate artifact surfaces (cover_letter, tailored_resume, salary_intelligence); consumers inject action + isDone via props
- **4-state machine with mutual exclusion** — idle | in-progress | error | silent-success; discriminated-union narrowing enforces at-most-one helper `<p>` rendered at any time; error + silent-success cannot co-render
- **Silent-success warning UX (AI-ACTION-07 primitive)** — verbatim SC #3 copy with em-dash U+2014, period terminator, italic + text-warning token; G-8 two-prong enforcement (source exact-count + DOM assertion)
- **3 pure isDone predicates in src/lib/regenerate-predicates.ts** — `coverLetterIsDone` / `tailoredResumeIsDone` (ISO getTime comparison), `salaryIntelligenceIsDone` (UTC-midnight date-granular); all handle null-detail, null-baseline INSERT-wait fallback, and exact-baseline boundary (strictly greater-than)
- **49 passing tests** — 17 ported Phase 23 cover_letter cases (zero behavior drift) + 5 tailored_resume + 5 salary_intelligence (incl. same-day rough-edge) + 4 grep gates + 21 predicate contract tests; `npm run build` green

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 RED: failing contract tests for regenerate-predicates** — `946dcae` (test)
2. **Task 1 GREEN: regenerate-predicates.ts with 3 pure isDone exports** — `0e69be0` (feat)
3. **Task 2 + Task 3 RED: failing component tests for regenerate-button** — `73d2d16` (test)
4. **Task 2 + Task 3 GREEN: regenerate-button.tsx with 4-state machine + silent-success** — `7724109` (feat)

_Tasks 2 + 3 were combined into a single RED/GREEN pair because the test file is the renamed + extended analog of the Phase 23 test file, and the component rename + generalization is the implementation that makes those tests pass. Splitting them would have produced a stale RED commit referencing a component file that hadn't yet been renamed, breaking the "tests describe the desired behavior of the file under test" TDD invariant._

**Plan metadata commit:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates)

## Files Created/Modified

- `src/lib/regenerate-predicates.ts` (NEW) — 3 pure isDone predicate exports with docblock pinning G-6 rationale (pure functions, `new Date(...)` for ISO/date parsing only); salaryIntelligenceIsDone appends `"T00:00:00Z"` for UTC-midnight parse per D-04
- `src/__tests__/lib/regenerate-predicates.test.ts` (NEW) — 21 cases per predicate covering null-detail, null-artifact, null-field, null-baseline INSERT-wait fallback, exact-baseline strictly-greater-than boundary, earlier-than-baseline, newer-than-baseline; salary includes same-day Pitfall 1 assertion
- `src/app/(admin)/admin/jobs/regenerate-button.tsx` (RENAMED from regenerate-cover-letter-button.tsx; regenerated) — 231 lines; generalized props interface (`RegenerateButtonProps` with artifact / label / action / isDone / baselineGeneratedAt); `RegenerateResult` discriminated union; 4-variant ButtonState; isDone prop call inside polling callback (replaces inline function); silent-success render branch with verbatim SC #3 copy; both .then and .catch 60-cap branches route to silent-success (not error); JSDoc documents state machine, G-6 extension, G-8 lock, Pitfall 6 unmount cleanup
- `src/__tests__/components/regenerate-button.test.tsx` (RENAMED from regenerate-cover-letter-button.test.tsx; regenerated) — 589 lines; 4 hoisted mock functions (3 actions + fetchJobDetail); 3 fixture helpers (renderCoverLetter / renderTailoredResume / renderSalaryIntelligence); SILENT_SUCCESS_COPY constant; 17 ported cover_letter cases (renderCoverLetter fixture); 5 tailored_resume cases (happy path, sibling-mock isolation, polling advance, 60-cap silent-success, error sentinel); 5 salary_intelligence cases (idle render, click-fires-action, date advance polling, same-day silent-success rough-edge, error sentinel); 4 grep-gate assertions targeting the renamed component file path

## Decisions Made

- **Predicate extraction to @/lib/regenerate-predicates.ts** — honored the UI-SPEC recommendation (`§Component Contracts 5`) over inlining. Rationale: 3 × ~8 lines of predicate logic benefits from isolated Vitest coverage without needing to mount the component; matches existing @/lib/score-color.ts / empty-state-copy.ts / format-salary.ts conventions; keeps the shared component's polling callback a one-line `isDone(detail, serverBaseline)` prop call.
- **silent-success stay-until-clicked** (no auto-revert) — matches the sentinel-error UX where the helper `<p>` stays visible until the owner explicitly re-clicks; simpler than a timer-based transition and owner may be looking away when the cap is reached. Documented in JSDoc state-machine table.
- **Unused `artifact` prop retained + suppressed via `void _artifact`** — the D-01 props contract is part of the public API so downstream mount sites (Plan 24-03) benefit from `artifact="..."` being enforced by TypeScript even though the current component body doesn't branch on it. Leaves the door open for per-artifact icon swaps without breaking callsites.
- **Both .then AND .catch 60-cap exit routes to silent-success** — in-progress is only reachable after a successful Server Action (`ok: true`), so reaching the cap unconditionally means the webhook reported success but the artifact never advanced. Merging both cap-exits preserves the "mutual exclusion" invariant: a failed webhook never produces silent-success; reaching the cap never produces an error. PATTERNS §1 Pitfall 2 explicit.
- **baselineGeneratedAt widened to `string | null`** — accommodates the INSERT-wait case where `getJobDetail` returns no prior artifact (`detail.cover_letter === null`), server returns `baseline: null`, and the predicate's `serverBaseline === null` branch returns true as soon as ANY row appears. Consistent with the existing `detail?.<artifact>?.<field>` optional-chaining contract.
- **salaryIntelligenceIsDone UTC-midnight parse** — `new Date(current + "T00:00:00Z").getTime()` avoids browser-locale TZ drift (a user in UTC-08 would otherwise parse `"2026-04-20"` as midnight local time and compare against a UTC epoch that's 8h offset). Date-granular same-day limitation is a known rough edge — documented in both the predicate docblock and the test file's `same-day regenerate triggers silent-success (known rough edge, Pitfall 1 / D-04)` case.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks, all 3 files, all 4 grep gates, all 32+ test cases landed as specified in 24-01-PLAN.md. No Rule 1 bugs found, no Rule 2 missing critical functionality required, no Rule 3 blockers hit, no Rule 4 architectural changes needed.

## Issues Encountered

None — the TDD pattern (test/RED → feat/GREEN per task) was smooth because:
- Phase 23's analog files (`regenerate-cover-letter-button.tsx` + test) provided a line-level template for the generalization deltas (imports, state machine, render tree, cap-exit fork)
- The silent-success state variant is structurally identical to the existing `{ kind: "error", sentinel }` terminal state — same render pattern, same helper `<p>` slot, same re-click-to-retry transition
- The 3 predicates compose cleanly because the only net-new complexity is the UTC-midnight parse for date-granular comparison; the null-handling / INSERT-wait branch logic is identical across all three

## Requirements Status

Plan 24-01's frontmatter claims `requirements: [AI-ACTION-05, AI-ACTION-06, AI-ACTION-07]`, but these REQs are NOT marked complete in this plan's execution. Rationale:

- **AI-ACTION-05** ("Owner can regenerate the tailored resume") requires the Server Action (Plan 24-02) + mount in tailored-resume-section.tsx (Plan 24-03) before the capability is owner-visible.
- **AI-ACTION-06** ("Owner can regenerate salary intelligence") requires the Server Action (Plan 24-02) + mount + jobId prop threading (Plan 24-03) before it's owner-visible.
- **AI-ACTION-07** ("Owner sees silent-success warning") requires the button mount in at least one section (Plan 24-03) before the state transition can be exercised against a live webhook flow end-to-end.

Plan 24-01 ships the foundational primitive (the component, predicates, and test coverage) that makes these REQs implementable — but closure happens in Plan 24-04's meta-doc finalization step. This matches the Phase 23 precedent where the Plan 23-01 `sendSignedWebhook` primitive didn't mark AI-SAFE-01 complete until Plan 23-02 consumed it and Plan 23-08 closed the phase.

## Grep Gates Enforced (on regenerate-button.tsx)

| Gate | Rule | Enforcement | Status |
|------|------|-------------|--------|
| G-1 | `aria-busy={isPolling}` present on Button element | readFileSync `/aria-busy=\{/` match | PASS |
| G-2 | No raw Tailwind color classes (`text-red-*`, `bg-amber-*`, etc.) | readFileSync negative-match regex on 10 color families × digit suffix | PASS |
| G-6 extended | `Date.now()` count = 0 in shared component | readFileSync `/Date\.now\(\)/g` match-count === 0 | PASS (0 occurrences) |
| G-8 NEW | Silent-success copy appears EXACTLY ONCE verbatim | readFileSync split-count on exact string with em-dash U+2014 === 1 | PASS (1 occurrence at line 226) |

G-3 (sentinel-verbatim interpolation) and G-4 (boundary-nesting) apply to mount sites and are covered in Plan 24-03. G-5 (label verbatim) moves from component to mount sites in Phase 24 (the component now takes `label` as a prop, not a literal).

## User Setup Required

None — no external service configuration, environment variables, or dashboard steps required for this plan. Phase 24's end-to-end owner-UAT depends on n8n webhook endpoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) which are tracked in the separate homelab repo and deferred to v3.5-P4 per the phase-level posture.

## Next Phase Readiness

- **Plan 24-02 unblocked** — the `RegenerateResult` discriminated-union shape (`{ ok: true; baseline: string | null } | { ok: false; sentinel: ErrorSentinel }`) is now the contract its 2 new Server Actions must satisfy. No additional type imports needed.
- **Plan 24-03 unblocked** — `RegenerateButton` + `{coverLetterIsDone, tailoredResumeIsDone, salaryIntelligenceIsDone}` are importable from `./regenerate-button` and `@/lib/regenerate-predicates` respectively. Mount sites will pass the Plan 24-02 actions as the `action` prop.
- **Plan 24-04 (meta-doc finalization) preconditions** — AI-ACTION-05/06/07 REQUIREMENTS.md checkboxes + traceability rows remain "Pending" (verified this plan — no premature marking). Plan 24-04's audit step has nothing to walk back.
- **Zero technical debt** — all 4 grep gates green, build clean, 49/49 plan-specific tests passing, old files (`regenerate-cover-letter-button.tsx` + its test file) fully deleted (no lingering re-export shims).

## Self-Check

Verified via filesystem + git inspection before finalizing:

- [x] `src/lib/regenerate-predicates.ts` exists with 3 exports
- [x] `src/app/(admin)/admin/jobs/regenerate-button.tsx` exists (renamed file; 231 lines)
- [x] `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` DELETED
- [x] `src/__tests__/components/regenerate-button.test.tsx` exists (589 lines)
- [x] `src/__tests__/components/regenerate-cover-letter-button.test.tsx` DELETED
- [x] `src/__tests__/lib/regenerate-predicates.test.ts` exists (21 cases)
- [x] Commit `946dcae` present in git log (RED predicates)
- [x] Commit `0e69be0` present in git log (GREEN predicates)
- [x] Commit `73d2d16` present in git log (RED component)
- [x] Commit `7724109` present in git log (GREEN component)
- [x] `npm test -- --run src/__tests__/components/regenerate-button.test.tsx src/__tests__/lib/regenerate-predicates.test.ts` → 49 passed / 49 total
- [x] `npm run build` exits 0
- [x] `grep -c "Date.now()"` on regenerate-button.tsx → 0 (G-6 extended green)
- [x] Silent-success copy appears exactly once in regenerate-button.tsx at line 226 (G-8 NEW green)
- [x] `aria-busy={isPolling}` present at line 214 (G-1 green)
- [x] No raw Tailwind color classes in regenerate-button.tsx (G-2 green)

## Self-Check: PASSED

---
*Phase: 24-regenerate-expansion-resume-salary-silent-success-state*
*Completed: 2026-04-23*
