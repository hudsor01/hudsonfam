---
phase: 23-owner-triggered-workflows-pattern-setter
plan: 06
subsystem: ui
tags:
  - react-client-component
  - polling
  - setInterval
  - fake-timers
  - vitest
  - useTransition
  - pessimistic-ui
  - shadcn-button
  - server-baseline
  - update-wait

# Dependency graph
requires:
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-02 regenerateCoverLetter Server Action returning { ok: true, baseline: string | null } | { ok: false, sentinel } — pre-webhook baseline read server-side (D-06 amended)"
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-02 fetchJobDetail Server Action returning FreshJobDetail with cover_letter.generated_at"
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-05 fake-timer polling test scaffold + INSERT-wait state machine (template for this plan's UPDATE-wait variant)"
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-01 ErrorSentinel 4-value union imported from @/lib/webhooks for the error-state discriminant"
provides:
  - "RegenerateCoverLetterButton client component (idle / in-progress{serverBaseline} / error state machine) — UPDATE-wait variant of Plan 23-05's pattern"
  - "G-6 source-text grep gate template: readFileSync + regex + diagnostic message asserting zero Date.now() in client files (D-06 amended enforcement)"
  - "Server-baseline pattern (capture pre-webhook DB timestamp in Server Action response, store in component state, compare via new Date() inside predicate body) — reusable for Phase 24 regenerate buttons"
  - "Prop-fallback pattern: server-returned null → prop baseline (INSERT-wait fallback inside UPDATE-wait component) — handles the no-prior-row edge case without forking the state machine"
affects:
  - "Plan 23-08 (mount RegenerateCoverLetterButton inside job-detail-sheet.tsx Cover Letter populated branch — final integration step for AI-ACTION-04)"
  - "Phase 24 RegenerateTailoredResumeButton (clones this UPDATE-wait + server-baseline pattern verbatim; only predicate field changes to tailored_resumes.generated_at)"
  - "Phase 24 RegenerateSalaryIntelligenceButton (clones this pattern; predicate field salary_intelligence.search_date)"

# Tech tracking
tech-stack:
  added: []  # Zero new deps — uses existing React 19 + lucide-react + shadcn/ui
  patterns:
    - "Server-baseline capture: Server Action returns { ok: true, baseline } where baseline is a server-read ISO string from the pre-webhook DB row; client stores it in the in-progress state variant and feeds it to the polling predicate"
    - "Prop baseline fallback: when server returns baseline=null (INSERT-wait case — no prior row), the component uses its baselineGeneratedAt prop as the comparison floor; both the prop and the server value originate server-side, never from a client clock"
    - "isDone predicate outside render: `new Date(...)` parse lives inside a helper function called only from the interval callback, never at render time — keeps the file free of client-clock reads (G-6)"
    - "G-6 grep gate: readFileSync + /Date\\.now\\(\\)/g match-count assertion with a diagnostic error message pointing editors at the server-baseline alternative"
    - "ButtonState with typed payload: { kind: 'in-progress'; serverBaseline: string } carries the captured baseline through polling ticks — closure-safe via discriminated-union access rather than a separate ref"
    - "it.each over ErrorSentinel union for G-3 sentinel-display coverage (inherited from Plan 23-05)"
    - "Fake-timer polling test pattern (inherited from Plan 23-05): vi.useFakeTimers in beforeEach, vi.useRealTimers in afterEach, await act(async => advanceTimersByTimeAsync(3000))"

key-files:
  created:
    - src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
    - src/__tests__/components/regenerate-cover-letter-button.test.tsx
  modified: []

key-decisions:
  - "Server-returned baseline takes precedence over the prop baseline at state-capture time — `res.baseline ?? baselineGeneratedAt` ensures the Server Action's authoritative read wins whenever available (D-06 amended); the prop is only a fallback for the baseline=null (no prior row) edge case"
  - "baseline stored inside the discriminated-union state variant `in-progress: { kind, serverBaseline }` rather than a separate useRef — the polling callback reads `serverBaseline` via closure capture when startPolling is invoked; simpler than a ref because the value is immutable for the lifetime of a single polling run"
  - "isDone uses `.getTime()` comparison on parsed Dates rather than lexicographic ISO string compare — lexicographic would work for the stable Postgres `timestamp with time zone` output but fails silently on format drift (e.g. 3-digit vs 6-digit milliseconds, or different timezone suffixes); .getTime() is spec-safe"
  - "Returns to `idle` on UPDATE (success) rather than to a terminal `done` state — regeneration is a repeatable operation, unlike INSERT in Plan 23-05 where parent-re-render unmounts the button. The button stays visible after success so the owner can re-click (Plan 23-08's mount will render it inside the `populated` branch of the Cover Letter section)"
  - "Reused Plan 23-05's cap-belt-and-suspenders pattern (both .then and .catch re-check `currentCount >= 60`) verbatim — no bespoke error handling for the regeneration flow; the 60-poll cap is the single error exit on the poll-side path"
  - "Reused Plan 23-05's Promise-chain setInterval (not async callback) — same stale-closure / race-hazard protection carried over"
  - "G-6 enforcement via source-text grep + diagnostic message — when a future editor accidentally reintroduces a wall-clock read, the failing test's error message tells them exactly which alternative to use ('use server-returned baseline instead')"
  - "17 test cases rather than the plan's stated '10' — mirrored Plan 23-05's 14-case scaffold (plan spec explicitly said 'mirrors 23-05 test scaffold + adds'), added the 3 UPDATE-wait-specific cases, and kept all 4 grep gates; the plan's min_lines: 140 and 'mirror structure' supersede the case-count estimate"

patterns-established:
  - "Server-baseline polling template: ButtonState { kind: 'in-progress', serverBaseline: string } + startPolling(baseline) + isDone(detail, baseline) — ready for Phase 24 regenerate buttons with a single-field swap (generated_at → search_date etc.)"
  - "Prop-fallback pattern for null-baseline cases: `res.baseline ?? propBaseline` — handles INSERT-wait as a special case of UPDATE-wait inside the same component"
  - "G-6 source-text grep gate with diagnostic message: the error string on the expect() call explains the violation AND the fix path; makes it a self-teaching gate for future editors"

requirements-completed:
  - AI-ACTION-04

# Metrics
duration: 17min
completed: 2026-04-23
---

# Phase 23 Plan 06: RegenerateCoverLetterButton Summary

**UPDATE-wait polling client component + 17-case fake-timer test suite — idle / in-progress{serverBaseline} / error state machine that captures the server-returned pre-webhook `cover_letters.generated_at` ISO string from the Server Action response, polls `fetchJobDetail` every 3s, and compares `new Date(detail.cover_letter.generated_at) > new Date(serverBaseline)` inside the predicate body so the file ships with zero client-clock reads (G-6 grep-gated).**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-04-23T03:33:24Z
- **Completed:** 2026-04-23T03:50:31Z
- **Tasks:** 3 (component, tests, atomic commit — per plan spec Task 23-06-03)
- **Files created:** 2 (205 + 338 = 543 LoC)
- **Files modified:** 0

## Accomplishments

- `RegenerateCoverLetterButton` shipped with full state machine (idle → in-progress{serverBaseline} → idle on UPDATE | error on sentinel | error on 60-poll cap) per UI-SPEC §Component Contracts 2 — pessimistic-only, D-10 locked
- D-06 amended enforcement end-to-end: server-returned `baseline` field from `regenerateCoverLetter` Server Action response is captured into component state, then passed into the polling predicate; prop baseline serves only as the null-fallback path
- G-6 source-text gate passes: grep against the compiled component source returns zero `Date.now()` occurrences (the diagnostic test message explicitly tells any future editor to "use server-returned baseline instead")
- All 4 UI-SPEC grep gates enforced inline via `readFileSync` source-text assertions: G-1 (aria-busy), G-2 (no raw Tailwind colors), G-5 (verbatim "Regenerate cover letter" label), G-6 (zero wall-clock reads)
- G-3 sentinel-verbatim rule locked via `it.each` over all 4 `ErrorSentinel` values — each renders literal `Error: {sentinel}` with zero client-side rewriting (inherited from Plan 23-05)
- Two UPDATE-wait-specific test cases shipped: (a) 3-tick fixture proving the predicate stops ONLY when `generated_at` advances strictly past `serverBaseline` (equal → not done), (b) server-returned baseline overrides prop baseline when the Server Action returns a non-null value, (c) prop baseline fallback when the Server Action returns `baseline: null` (INSERT-wait case inside an UPDATE-wait component)
- AI-ACTION-04 closed at the client layer; combined with Plan 23-02's `regenerateCoverLetter` Server Action the AI-ACTION-04 surface is now end-to-end complete pending Plan 23-08's button mount inside the `job-detail-sheet.tsx` Cover Letter `populated` branch

## Task Commits

TDD sequence inside the single atomic commit (per plan Task 23-06-03's explicit single-commit requirement):

1. **RED gate** — Test file written FIRST at `src/__tests__/components/regenerate-cover-letter-button.test.tsx`; `npm test -- --run` confirms `Failed to resolve import "@/app/(admin)/admin/jobs/regenerate-cover-letter-button"` (0 tests, 1 failed suite)
2. **GREEN gate** — Component written at `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx`; same test file now 16 passed / 17 total (G-6 initially flagged doc-comment literals)
3. **Rule 1 auto-fix** — Doc-comment rephrasing: 3 literal `Date.now()` strings in prose replaced with "the wall-clock API" / "the wall clock" phrasings; tests re-run clean 17/17 GREEN
4. **Atomic commit** — `d7eab3c` bundles both files per Plan 23-06 Task 3's explicit single-commit specification

**Commit:**

1. **Tasks 1 + 2 + 3 (atomic):** `d7eab3c` — `feat(23-06): RegenerateCoverLetterButton — server-baseline polling + fake-timer tests (AI-ACTION-04)`

_Note: Plan 23-06 (like 23-05) specifies a SINGLE atomic commit covering both files (Task 3), even though Tasks 1 and 2 are TDD-marked. The RED → GREEN gate sequence was observed in the working-tree-only pre-commit state to honor the TDD protocol; the final commit bundles both files per the plan's explicit atomic-commit requirement._

## Files Created/Modified

- `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` (NEW, 205 lines) — `RegenerateCoverLetterButton` client component. `"use client"` directive; `useState` for `ButtonState` discriminated union (`idle` | `in-progress{serverBaseline: string}` | `error`); `useRef` for `pollCountRef` + `intervalRef`; `useTransition` for the initial Server Action call; `useEffect` cleanup clears any active interval on unmount. Uses shadcn `Button` variant="outline" size="sm" + lucide `Loader2` / `RefreshCw` icon swap. Sentinel rendered below the button in `<p className="text-destructive text-xs mt-1">`. Zero raw Tailwind color class names; zero wall-clock reads. `isDone(detail, serverBaseline)` helper parses ISO strings via `new Date(...)` inside its body only — called from the polling callback, never at render time.

- `src/__tests__/components/regenerate-cover-letter-button.test.tsx` (NEW, 338 lines, 17 cases) — Two describe blocks: (a) 13 behavior tests (idle render; click fires action; in-progress disabled+aria-busy; 3s polling cadence; UPDATE-wait stop at 3rd tick when generated_at > serverBaseline; server-returned baseline precedence test; prop baseline fallback when server returns null; 60-poll timeout + sentinel display; unmount clears interval; 4× sentinel display via `it.each`), (b) 4 source-text grep gates (G-1, G-2, G-5, G-6). Mocks `@/lib/job-actions` via `vi.hoisted` + `vi.mock`. `vi.useFakeTimers`/`vi.useRealTimers` in `beforeEach`/`afterEach`.

## Decisions Made

- **Server-returned baseline takes precedence over prop** — `res.baseline ?? baselineGeneratedAt` inside `handleClick` captures the Server Action's authoritative DB read (pre-webhook) whenever available; the prop is a fallback for the `baseline: null` edge case only. This means the component is correct even if the parent's rendered `baselineGeneratedAt` was stale (e.g. between server-render and user click the row got updated by something else) — the Server Action's response always wins.
- **`serverBaseline` lives inside the `in-progress` state variant, not a ref** — the value is immutable for the lifetime of a single polling run, and `startPolling(baseline)` receives it as a closure argument; discriminated-union typing guarantees callers can't access `serverBaseline` outside the `in-progress` state.
- **`isDone` uses `.getTime()` comparison on parsed Dates** — lexicographic ISO-8601 would work for Postgres's stable output but fails silently on format drift (3-vs-6-digit ms, `Z` vs `+00:00`); `.getTime()` is spec-safe against any ISO-8601 variant Postgres or the attach-freshness layer might produce in future.
- **Returns to `idle` after UPDATE success, not to a terminal `done` state** — regeneration is repeatable. Unlike Plan 23-05's INSERT-wait where the parent re-renders and unmounts the button, Plan 23-08 will mount this button inside the `populated` branch of the Cover Letter section, so it stays visible for re-clicks. `idle` IS the success-terminal state.
- **G-6 grep gate enforcement uses a diagnostic error message** — `expect(matches, "Date.now() found... use server-returned baseline instead").toBe(0)` — so a future editor who accidentally violates D-06 amended sees not just "0 expected, 1 received" but the fix path in the same output line.
- **17 test cases, not 10** — the plan spec said both "10 test cases" in its estimated count AND "mirrors 23-05 test scaffold + adds" in its action spec. The scaffold-mirroring directive is more specific, so I cloned 23-05's 14-case structure and added 3 UPDATE-wait-specific cases (predicate stop timing + server-precedence + prop fallback). The plan's `min_lines: 140` is satisfied at 338 LoC.
- **Test file does NOT wrap in `TooltipProvider`** — matches Plan 23-05's scaffold; this component uses no tooltips.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] G-6 doc-comment literals tripped the grep gate**

- **Found during:** Task 2 (test run after writing component)
- **Issue:** The G-6 gate uses `readFileSync + /Date\.now\(\)/g` — a substring match over the entire source, including doc comments. The component had 3 legitimate references to `Date.now()` inside JSDoc/inline comments that were trying to DESCRIBE the prohibition ("NEVER captures Date.now()", "Date.now() never appears in this file", "no Date.now() call"). The gate correctly flagged these: if the prose contains the literal string, a careless editor could remove the "NEVER" and accidentally call the function.
- **Fix:** Rephrased all 3 doc-comment references to describe the prohibition without naming the literal API. "Date.now()" → "the wall clock" / "the wall-clock millisecond API" / "wall-clock read". Semantics preserved; the gate passes.
- **Files modified:** `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` (doc comments only — zero production-logic changes)
- **Verification:** `grep -c "Date.now()" regenerate-cover-letter-button.tsx` returns 0 (shell). G-6 test case 17/17 passes.
- **Committed in:** `d7eab3c` (atomic commit — fix applied pre-commit)
- **Pattern:** Identical to Plan 21-06's `empty-state-copy.ts` doc-comment rephrasing to dodge the anti-CTA grep gate. Source-text grep gates cannot distinguish executable code from prose, so doc comments must avoid the literal forbidden strings.

**2. [Rule 2 - Missing Critical] Test-count expansion from 10 → 17 to honor "mirror 23-05 scaffold" directive**

- **Found during:** Task 2 (test file planning)
- **Issue:** The plan's action pseudo-code enumerated 6 explicit test cases + 1 `it.each` (4 rows) + the 4-case "plus" list (baseline UPDATE, baseline null fallback, G-6 grep, label verbatim) = 11 behavior + 4 grep gates. But the plan's <verify> spec said "All 10 tests pass" and `min_lines: 140`. The `mirror 23-05 test scaffold` directive in the action prose is more specific than the count estimate, and 23-05 ships 14 cases. Choosing between "exactly 10" (drop 23-05-scaffold cases) and "mirror 23-05" (keep all cases + UPDATE-wait additions) the latter preserves more coverage.
- **Fix:** Shipped 13 behavior tests + 4 grep gates = 17 cases, 338 LoC. All 23-05 scaffold cases preserved (idle render, click-fires-action, in-progress disabled+aria-busy, 3s cadence, 60-poll cap, unmount-clears-interval, 4× sentinel `it.each`) plus the 3 UPDATE-wait additions (predicate stop timing, server baseline precedence, prop baseline fallback) plus the 4 grep gates (G-1, G-2, G-5, G-6).
- **Files modified:** `src/__tests__/components/regenerate-cover-letter-button.test.tsx`
- **Verification:** 17/17 tests pass; full suite 505/505 pass (+17 from the 488 baseline pre-Plan-23-06).
- **Committed in:** `d7eab3c` (atomic commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 doc-comment rephrasing — identical pattern to Plan 21-06's CTA-grep fix; 1 Rule 2 test-count expansion honoring scaffold-mirror directive over count-estimate)
**Impact on plan:** No scope creep, no architectural change, no production-logic drift. Every plan-level acceptance criterion is met verbatim (component exists + exports, "use client" first line, aria-busy, no raw Tailwind, verbatim label, Date.now() grep = 0, in-progress state carries serverBaseline, isDone uses `new Date(...)`, clearInterval in useEffect cleanup, test file exists, tests pass, build passes, single atomic commit with `feat(23-06):` subject). The 17-case vs 10-case delta is pure additive coverage.

## Issues Encountered

- None beyond the 2 deviations documented above. All preconditions from Plans 23-01, 23-02, and 23-05 (`sendSignedWebhook`, `regenerateCoverLetter`, `fetchJobDetail`, `ErrorSentinel` type, fake-timer test scaffold) were already in place from prior plans. The shell's `git log` output in this environment is wrapped in `bat`-style ANSI color codes when piped, which caused a decorative subject-gate grep to fail even though the raw commit subject is exactly `feat(23-06): RegenerateCoverLetterButton — server-baseline polling + fake-timer tests (AI-ACTION-04)` as required by plan Task 3's `<verify>` clause.

## User Setup Required

None — this plan adds only client component code + tests. No environment variables, no external services, no dashboard configuration.

## Verification

**Component file source-text gates:**

```
$ grep -c "use client" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
1
$ grep -c "aria-busy" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
2
$ grep -c "Regenerate cover letter" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
2
$ grep -c "Date.now()" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
0    # G-6 passes
$ grep -E "(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-[0-9]" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
(zero matches — G-2 passes)
```

**Test suite:**

```
$ npm test -- --run src/__tests__/components/regenerate-cover-letter-button.test.tsx
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

**Full suite + build:**

```
$ npm test
 Test Files  35 passed (35)
      Tests  505 passed (505)
$ npm run build
✓ Compiled successfully
```

## Threat Flags

None. This plan adds client-side UI that consumes already-gated Server Actions (`regenerateCoverLetter` requires owner role per Plan 23-02 D-12; `fetchJobDetail` requires owner role). No new trust boundaries, no new auth paths, no new file-access patterns, no new schema changes.

T-23-06-01 (Tampering: baseline) mitigated as specified — the baseline is a server-read `cover_letters.generated_at` ISO string returned by the authenticated Server Action; the client cannot supply a fake baseline without a successful authenticated action call. G-6 grep gate asserts `Date.now()` absent from component source, eliminating the clock-skew attack surface.

T-23-06-02 (DoS: polling loop) mitigated as specified — same 60-poll hard cap as Plan 23-05 (60 × 3s = 180s), belt-and-suspenders on both `.then` and `.catch` branches.

T-23-06-03 (Info Disclosure: baseline in props) accepted as specified — `baselineGeneratedAt` is a `cover_letters.generated_at` ISO timestamp; not PII, not secret.

## Next Phase Readiness

- **Plan 23-07** (UI unification / minor polish per phase-level spec) can run in parallel — its scope doesn't touch this button.
- **Plan 23-08** (mount `RegenerateCoverLetterButton` inside `job-detail-sheet.tsx`'s Cover Letter `populated` branch) is unblocked. The component exists, props interface is stable (`jobId: number, baselineGeneratedAt: string`), and the post-success behavior (`returns to idle, stays visible for re-clicks`) matches the populated-branch mount point. The parent will derive `baselineGeneratedAt` from `detail.cover_letter?.generated_at ?? ""` at render time (fallback string for the populated branch where the letter DOES exist is fine — that value is only used if the server returns `baseline: null`, which won't happen in the populated branch).
- **Phase 24** regenerate buttons (tailored resume + salary intelligence) clone this pattern verbatim — state machine, test scaffold, G-6 grep gate, server-baseline capture. Tailored Resume flips the predicate field to `tailored_resumes.generated_at`; Salary Intelligence flips to `salary_intelligence.search_date`. The `isDone(detail, serverBaseline)` helper is the single swap site.
- **AI-ACTION-04 surface** is client-complete pending Plan 23-08 integration; Phase 23's remaining work narrows to UI polish (Plan 23-07) + mount integration (Plan 23-08).

## Self-Check

- [x] `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — FOUND
- [x] `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — FOUND
- [x] Commit `d7eab3c` — FOUND in git log (`git log --oneline --all | grep d7eab3c` returns hit)
- [x] G-6 grep: 0 occurrences of `Date.now()` in component source
- [x] G-1 grep: `aria-busy=\{` present (2 occurrences — one on Button, one in docstring description of the attribute)
- [x] G-2 grep: 0 raw Tailwind color class matches
- [x] G-5 grep: "Regenerate cover letter" present (2 occurrences — one in Button, one in docstring)
- [x] `npm test` → 505/505 pass
- [x] `npm run build` → exit 0

## Self-Check: PASSED

---

*Phase: 23-owner-triggered-workflows-pattern-setter*
*Plan: 06*
*Completed: 2026-04-23*
