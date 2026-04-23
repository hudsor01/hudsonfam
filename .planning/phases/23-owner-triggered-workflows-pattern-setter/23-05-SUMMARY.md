---
phase: 23-owner-triggered-workflows-pattern-setter
plan: 05
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

# Dependency graph
requires:
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-02 triggerCompanyResearch + fetchJobDetail Server Actions with discriminated-union return contract"
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-01 sendSignedWebhook + ErrorSentinel union (imported transitively via @/lib/webhooks type reference)"
provides:
  - "TriggerCompanyResearchButton client component (idle / in-progress / error state machine)"
  - "First fake-timer polling test pattern in the project (vi.useFakeTimers + vi.advanceTimersByTimeAsync + act)"
  - "Reusable INSERT-wait polling template for Phase 24 regenerate buttons"
  - "Grep-gate G-1 (aria-busy) / G-2 (no raw Tailwind) / G-5 (verbatim label) enforcement pattern for Phase 23-06 + Phase 24"
affects:
  - Plan 23-06 (button mount + visibility gating inside Company Intel missing branch)
  - Phase 24 RegenerateTailoredResumeButton (clones this fake-timer test pattern + state machine verbatim)
  - Phase 24 RegenerateSalaryIntelligenceButton (clones this pattern verbatim; baseline=null for INSERT-wait)

# Tech tracking
tech-stack:
  added: []  # Zero new deps — uses existing React 19 + lucide-react + shadcn/ui
  patterns:
    - "setInterval + useRef counter + clearInterval on (done | cap | unmount) — vanilla polling per D-04 (no TanStack Query)"
    - "vi.useFakeTimers + vi.advanceTimersByTimeAsync(3000) + act() — fake-timer polling test scaffold"
    - "useTransition for Server Action call (isPending merged into isDisabled); separate ButtonState union for post-transition polling + error states"
    - "ButtonState discriminated union: { kind: 'idle' } | { kind: 'in-progress' } | { kind: 'error', sentinel }"
    - "INSERT-wait predicate: detail?.company_research !== null && detail?.company_research !== undefined (D-06)"
    - "Sentinel rendered verbatim via 'Error: ' + state.sentinel (G-3 — no client-side string rewriting)"

key-files:
  created:
    - src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
    - src/__tests__/components/trigger-company-research-button.test.tsx
  modified: []

key-decisions:
  - "Component owns its own polling lifecycle via useRef + useEffect-cleanup (parent only passes jobId) — keeps the polling state machine colocated with the UI that displays it and matches the component-owned pattern Phase 20-06 SectionErrorBoundary established"
  - "Single `jobId` prop only — no `onComplete` callback needed because parent's `detail.company_research === null` branch unmounts this button once the INSERT lands; the parent re-render IS the completion signal (D-09 visibility gate semantics)"
  - "useTransition wraps the initial Server Action call; setInterval polling runs OUTSIDE startTransition so timer ticks aren't treated as transitions (React 19 spec — isPending only tracks the wrapped call's pending state, not arbitrary subsequent state updates)"
  - "pollCountRef.current captured into currentCount local BEFORE the async fetchJobDetail call — avoids stale-closure / race bugs where a newer tick's increment would be read by an earlier tick's .then() handler (RESEARCH.md §Pitfall 8)"
  - "fetchJobDetail rejections don't abort polling — they count against the 60-poll cap. Transient network blips during a 180s window shouldn't crash the owner-triggered workflow; the cap is the single error exit"
  - ".catch() handler AND .then() handler both re-check the cap to avoid orphan intervals — belt-and-suspenders on the cleanup path"
  - "test file uses rtlRender directly (no TooltipProvider wrapper needed — component uses no tooltips, unlike Plan 21-04's TailoredResumeSection); keeps the test scaffold minimal"

patterns-established:
  - "Fake-timer polling test pattern: beforeEach{useFakeTimers}, afterEach{useRealTimers}, act(async => advanceTimersByTimeAsync(3000))"
  - "it.each over ErrorSentinel union for sentinel-display coverage: one `it.each` replaces 4 individual `it` cases, locks all 4 sentinel strings verbatim"
  - "readFileSync grep gates inline at bottom of component test files (G-1/G-2/G-5) — inherits Phase 22-07's job-detail-sheet.test.tsx adjacency-gate pattern"
  - "Client-side polling state machine template ready for Phase 24 regenerate buttons"

requirements-completed:
  - AI-ACTION-03

# Metrics
duration: 8min
completed: 2026-04-23
---

# Phase 23 Plan 05: TriggerCompanyResearchButton Summary

**Polling client component + first fake-timer test suite — idle/in-progress/error state machine over 3s-cadence setInterval with 60-poll cap and clearInterval-on-unmount, backed by 14 Vitest cases exercising every state transition and all 3 UI-SPEC grep gates.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-23T03:23:00Z
- **Completed:** 2026-04-23T03:26:15Z
- **Tasks:** 3 (component, tests, commit)
- **Files created:** 2
- **Files modified:** 0

## Accomplishments

- `TriggerCompanyResearchButton` shipped with full state machine (idle → in-progress → error) per UI-SPEC §Component Contracts 1 — pessimistic-only, D-10 locked
- First fake-timer polling test scaffold in the project — 14 cases using `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync` + `act`, uses Phase 23-02's `vi.hoisted` + `vi.mock` mock pattern
- All 3 UI-SPEC grep gates enforced inline via `readFileSync` source-text assertions: G-1 (aria-busy), G-2 (no raw Tailwind colors), G-5 (verbatim "Research this company" label)
- G-3 sentinel-verbatim rule locked via `it.each` over all 4 `ErrorSentinel` values — each renders literal `Error: {sentinel}` with zero client-side rewriting
- AI-ACTION-03 closed at the client layer; combined with Plan 23-02's Server Action (`triggerCompanyResearch`) the AI-ACTION-03 surface is now end-to-end complete pending Plan 23-06's button mount inside `job-detail-sheet.tsx`

## Task Commits

TDD sequence inside the single atomic commit:

1. **RED gate** — Test file written FIRST at `src/__tests__/components/trigger-company-research-button.test.tsx`; `npm test -- --run` confirms `Failed to resolve import "@/app/(admin)/admin/jobs/trigger-company-research-button"` (0 tests, 1 failed suite)
2. **GREEN gate** — Component written at `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx`; same test file now 14 passed / 14 total
3. **Atomic commit** — `a90a5e4` (feat) combines both files per Plan 23-05 Task 3's single-commit specification

**Commit:**

1. **Tasks 1 + 2 + 3 (atomic):** `a90a5e4` — `feat(23-05): TriggerCompanyResearchButton — polling UI + fake-timer tests (AI-ACTION-03)`

_Note: Plan 23-05 specifies a SINGLE atomic commit covering both files (Task 3), even though Tasks 1 and 2 are TDD-marked. The RED → GREEN gate sequence was observed in the working-tree-only pre-commit state (test file staged first and failing against missing source) to honor the TDD protocol; the final commit bundles both files per the plan's explicit atomic-commit requirement._

## Files Created/Modified

- `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` (NEW, 167 lines) — `TriggerCompanyResearchButton` client component. `"use client"` directive; `useState` for `ButtonState` discriminated union (`idle` | `in-progress` | `error`); `useRef` for `pollCountRef` + `intervalRef`; `useTransition` for the initial Server Action call; `useEffect` cleanup clears any active interval on unmount. Uses shadcn `Button` variant="outline" size="sm" + lucide `Loader2` / `Sparkles` icon swap. Sentinel rendered below the button in `<p className="text-destructive text-xs mt-1">`. Zero raw Tailwind color class names; zero `Date.now()` calls.

- `src/__tests__/components/trigger-company-research-button.test.tsx` (NEW, 201 lines, 14 cases) — Two describe blocks: (a) 11 behavior tests (idle render, click fires action, in-progress disabled+aria-busy, 3s polling cadence, INSERT-wait stop, 60-poll timeout + sentinel display, unmount clears interval, 4× sentinel display via `it.each`), (b) 3 source-text grep gates (G-1, G-2, G-5). Mocks `@/lib/job-actions` via `vi.hoisted` + `vi.mock`. `vi.useFakeTimers`/`vi.useRealTimers` in `beforeEach`/`afterEach`.

## Decisions Made

- **Polling lives in the component, not the parent** — keeps the state machine colocated with the UI that displays state transitions; no prop-drilling of a polling predicate; parent's job is pure (just renders the button when `company_research === null`)
- **Single `jobId` prop — no `onComplete`** — parent's re-render on `company_research` INSERT IS the completion signal; the button unmounts naturally from the parent's `missing` branch flipping to `populated`
- **`useTransition` wraps the initial click only** — isPending merges into isDisabled for the quick server-action window (≤1s typical); setInterval ticks are ordinary state updates (not transitions) so React's concurrency scheduler treats them as urgent — appropriate for "flip to idle / error" which are user-facing terminal state changes
- **pollCountRef captured into `currentCount` local inside the interval callback** — ensures the cap check in the `.then()` / `.catch()` handlers uses the tick's own count, not a later tick's mutated value (stale-closure guard)
- **`.catch()` still checks the cap** — transient fetch failures mid-poll shouldn't abort the workflow; they count against the cap and surface `"unavailable"` when the cap is hit, matching D-07's sentinel mapping intent (non-classifiable failure = `"unavailable"`)
- **Test file does NOT wrap in `TooltipProvider`** — this component uses no tooltips (unlike Plan 21-04's `TailoredResumeSection`); keeps the test scaffold minimal and fast

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `.catch()` handler re-checks 60-poll cap**

- **Found during:** Task 1 (component implementation)
- **Issue:** The plan's action pseudocode shows a `try { ... } catch {}` pattern inside the interval callback, with only the `try` branch's cap check having teeth; the `catch` branch in the plan pseudo-code also checks the cap but the plan's prose only emphasizes `try`. A naive implementation that reset the cap check only on the success path would leak intervals if `fetchJobDetail` started throwing at poll 59 — polls 60/61/62... would each increment the ref but never hit a cap check.
- **Fix:** Both `.then()` success predicate and `.catch()` rejection handler check `currentCount >= 60` and clearInterval + set error sentinel accordingly. Belt-and-suspenders.
- **Files modified:** `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx`
- **Verification:** Test case #6 ("times out after 60 polls") passes with mocked `fetchJobDetail.mockResolvedValue({ company_research: null })` (covers `.then()` branch). The `.catch()` branch is defensive-only — no explicit test case because the plan's own acceptance criteria don't require one and a test would require mocking rejections AT the cap boundary, which is fragile fake-timer sequencing.
- **Committed in:** `a90a5e4` (atomic commit)

**2. [Rule 2 - Missing Critical] Promise-based polling instead of async interval callback**

- **Found during:** Task 1 (component implementation)
- **Issue:** The plan's action pseudo-code writes `setInterval(async () => { ... await fetchJobDetail ... })` — passing an async function to `setInterval` is a known anti-pattern: overlapping ticks can pile up pending promises that resolve out of order and race on `pollCountRef`. If a `fetchJobDetail` call takes >3s, the next tick starts before the previous resolves; both increment the ref and the inner check becomes non-deterministic.
- **Fix:** Implemented as `setInterval(() => { pollCountRef.current += 1; const currentCount = pollCountRef.current; void fetchJobDetail(jobId).then(...).catch(...); }, 3000)`. Increment is synchronous (ordered); the async fetch chains off a captured snapshot; if a fetch takes >3s the next tick still fires cleanly (queueing is OK because the check uses `currentCount` not `.current`).
- **Files modified:** `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx`
- **Verification:** Test case #4 ("polls fetchJobDetail every 3 seconds") passes — 3 ticks produces 3 calls, order-deterministic. Test case #6 (60-poll cap) passes — the synchronous increment + captured snapshot keeps the cap check stable across 60 sequential ticks.
- **Committed in:** `a90a5e4` (atomic commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing critical robustness on the polling control path)
**Impact on plan:** No scope creep. Both deviations harden the polling state machine against race conditions the plan's pseudo-code would have exposed in production under slow-network / slow-fetch conditions. The observable behavior (14 test cases, all 3 grep gates) is identical to the plan's specification; the internal implementation is safer.

## Issues Encountered

- None. All preconditions from Plans 23-01 and 23-02 (`sendSignedWebhook`, `triggerCompanyResearch`, `fetchJobDetail`, `ErrorSentinel` type) were already in place. Plan 23-03's `fireWebhook` deletion had also already landed by the time Plan 23-05 executed (STATE.md was slightly stale — grep confirmed `fireWebhook` is gone from `src/lib/job-actions.ts`; all call sites already use `sendSignedWebhook`).

## User Setup Required

None — this plan adds only client component code + tests. No environment variables, no external services, no dashboard configuration.

## Verification

**Component file source-text gates:**

```
$ grep -c "aria-busy" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
3
$ grep -c "Research this company" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
2
$ grep -c "use client" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
1
$ grep -E "(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-[0-9]" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
(zero matches — G-2 passes)
```

**Test suite:**

```
$ npm test -- --run src/__tests__/components/trigger-company-research-button.test.tsx
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

**Full suite + build:**

```
$ npm test
 Test Files  34 passed (34)
      Tests  488 passed (488)
$ npm run build
✓ Compiled successfully
```

## Threat Flags

None. This plan adds client-side UI that consumes already-gated Server Actions (`triggerCompanyResearch` requires owner role; `fetchJobDetail` requires owner role). No new trust boundaries, no new auth paths, no new file-access patterns, no new schema changes. The component cannot observe data without owner auth (both Server Actions fail-closed via `requireRole(["owner"])`). Polling loop is DoS-bounded at 60 polls × 3s = 180s hard cap per plan threat register T-23-05-01.

## Next Phase Readiness

- **Plan 23-06** (integration — mount button inside `job-detail-sheet.tsx` Company Intel `missing` branch inside `SectionErrorBoundary section="company_research"`) is now unblocked. The component exists, the props interface is stable, the visibility-gate semantics (parent-controlled mount/unmount via `detail.company_research === null`) are documented in both the UI-SPEC §D-09 and the component's own docblock.
- **Plan 23-07** (RegenerateCoverLetterButton) can be executed in parallel with 23-06 — this plan's state machine + fake-timer test scaffold is the template. The only differences are: (a) the component takes a `baselineGeneratedAt: string` prop, (b) the predicate is `detail.cover_letter?.generated_at > baseline` (clock-domain safe — server-side baseline per D-06 amended), (c) the icon is `RefreshCw` not `Sparkles`, (d) the label is "Regenerate cover letter".
- **Phase 24** regenerate buttons (tailored resume + salary intelligence) clone this pattern verbatim — the `RegenerateCoverLetterButton` from Plan 23-07 becomes the generic template; Phase 24's two new buttons are `predicate=generated_at > baseline` and `predicate=search_date > baseline` variants respectively.
- **No blockers** for downstream work. The first fake-timer polling test in the project exists as a reference implementation for all subsequent poll-based components.

## Self-Check

- [x] `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` — FOUND
- [x] `src/__tests__/components/trigger-company-research-button.test.tsx` — FOUND
- [x] Commit `a90a5e4` — FOUND in git log

## Self-Check: PASSED

---

*Phase: 23-owner-triggered-workflows-pattern-setter*
*Plan: 05*
*Completed: 2026-04-23*
