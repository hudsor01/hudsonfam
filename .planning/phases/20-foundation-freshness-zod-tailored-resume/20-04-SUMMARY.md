---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 04
subsystem: ui
tags: [react, client-component, class-component, error-boundary, tooltip, shadcn, tailwind-v4, freshness-badge]

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: "isStale() util + STALE_THRESHOLDS (Plan 20-02); tooltip/radix primitives already installed in repo"
provides:
  - "src/app/(admin)/admin/jobs/freshness-badge.tsx — reusable client FreshnessBadge rendering 'Generated {relativeTime} · {modelUsed}' with optional bg-warning dot + shadcn Tooltip on stale"
  - "src/app/(admin)/admin/jobs/section-error-boundary.tsx — hand-rolled React class SectionErrorBoundary (no react-error-boundary dep) with per-section isolation + server-side [ai-section] console.error log + muted inline fallback"
  - "Exact UI-SPEC §2/§3 render trees (typography, spacing, colors, ARIA) locked in for all Phase 20+ AI artifact sections"
affects:
  - "20-05 (TailoredResumeSection): renders FreshnessBadge next to the Tailored Resume heading and wraps its render tree in SectionErrorBoundary"
  - "20-06 (job-detail-sheet integration): cover_letter + company_research + tailored_resume sections each wrapped in SectionErrorBoundary with a FreshnessBadge in each heading row"
  - "22 (salary intelligence render): reuses FreshnessBadge and SectionErrorBoundary with section='salary_intelligence'"
  - "23 (regenerate): regenerate-failure UI will wrap or replace SectionErrorBoundary fallback — but the fallback stays terminal for Phase 20 (no retry button)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-computed props for hydration-safe date rendering — FreshnessBadge receives relativeTime/isStale/ageDays pre-computed; never calls new Date() client-side"
    - "Hand-rolled React class ErrorBoundary per D-09 discretion — 4 boundaries in the app; class component is ~30 LoC; new dep unjustified"
    - "Server-side-only error logging — componentDidCatch writes to console.error with [ai-section] prefix; DOM never receives error.message or stack (Pitfall 3 extended to render errors)"
    - "HTML-entity copy for typographically-correct punctuation — '&rsquo;' for curly apostrophe, '&mdash;' for em-dash, renders as literal Unicode in the DOM"
    - "Section label map (SECTION_LABELS) colocated inside the boundary file — single source of truth across cover_letter / tailored_resume / company_research / salary_intelligence fallbacks"

key-files:
  created:
    - "src/app/(admin)/admin/jobs/freshness-badge.tsx (87 lines): 'use client' component; fresh = inline muted text, stale = +bg-warning dot + TooltipProvider/Tooltip/TooltipTrigger/TooltipContent; returns null when relativeTime is empty"
    - "src/app/(admin)/admin/jobs/section-error-boundary.tsx (79 lines): 'use client' React class component with getDerivedStateFromError + componentDidCatch; logs [ai-section] payload to console.error; fallback = muted heading + italic muted sentence (no border, no bg, no retry button)"
    - "src/__tests__/components/freshness-badge.test.tsx (77 lines): 5 Vitest cases (fresh+model, no-model, stale-dot+aria, null-when-empty, typography classes)"
    - "src/__tests__/components/section-error-boundary.test.tsx (116 lines): 6 Vitest cases (happy path, fallback copy, server log payload, boundary isolation, muted-not-destructive classes, per-section labels)"
  modified: []

key-decisions:
  - "No `new Date()` inside FreshnessBadge — all date math (formatDistanceToNow, isStale, ageDays) is the server's responsibility; badge is pure-display. Hydration-safe per UI-SPEC §Pattern 2."
  - "TooltipProvider wrapped INSIDE FreshnessBadge's stale branch rather than requiring the caller to mount one — badge is drop-in; caller never knows whether a given artifact is stale."
  - "Middle-dot U+00B7 with `aria-hidden='true'` — separator is visual-only; screen readers skip it. Not hyphen, not pipe (UI-SPEC §Copywriting)."
  - "`size-1.5` (6px) rounded-full dot per UI-SPEC — distinctly dot-shaped but small enough not to pull focus from the meta text."
  - "SectionErrorBoundary is hand-rolled (no react-error-boundary dep) per CONTEXT.md D-09. 4 boundaries in the codebase; 30 LoC class; new dep would be overkill."
  - "`'use client'` directive required on section-error-boundary.tsx — React class components cannot render server-side in Next.js 16 App Router."
  - "Fallback UI uses `text-muted-foreground italic` NOT `text-destructive` — stale-data and render drift are informational, not destructive. `text-destructive` is reserved for Phase 23 regenerate failures per UI-SPEC §3."
  - "Fallback is terminal for Phase 20 (no retry button) — retry logic belongs with regenerate in Phase 23; pushing it earlier would couple display to unimplemented action UI."
  - "`[ai-section]` log prefix + structured payload `{ section, jobId, error, stack, componentStack }` — greppable across kubectl logs and JSON-parseable by downstream log tooling."
  - "Curly apostrophe + em-dash via HTML entities (`&rsquo;`, `&mdash;`) — renders as literal `'`/`—` in the DOM; matches UI-SPEC §3 copy exactly; tests assert against the Unicode forms."
  - "React 19 Strict Mode may double-invoke `componentDidCatch` — tests assert `aiSectionCalls.length >= 1`, not exactly 1 (RESEARCH §Q4 gotcha)."

patterns-established:
  - "Client-side AI-artifact display components accept server-computed primitives only (strings, booleans, numbers) — no Date objects, no timestamps, no promises cross the boundary"
  - "Per-section ErrorBoundary granularity — one boundary per AI artifact, never one boundary wrapping the whole sheet (D-09)"
  - "console.error with structured payload object as the second arg — log tooling JSON-parses it; never string-concat"
  - "HTML entities in JSX for typographically-correct copy — renders as the correct Unicode glyph, tests match on the Unicode form (not the entity)"
  - "shadcn Tooltip usage pattern: `<TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><span ...><TooltipContent>copy</TooltipContent></Tooltip></TooltipProvider>` — reusable for any future hover-info affordance in the admin shell"

requirements-completed:
  - "AI-RENDER-02"

# Metrics
duration: 3m
completed: 2026-04-21
---

# Phase 20 Plan 04: FreshnessBadge + SectionErrorBoundary Summary

**Two reusable client components shipped for Phase 20 AI artifact sections: `<FreshnessBadge>` renders the "Generated {relativeTime} · {modelUsed}" meta line with an optional amber stale-dot + shadcn Tooltip, and `<SectionErrorBoundary>` is a hand-rolled React class boundary that isolates render failures to a single section while logging `[ai-section]` payloads server-side only.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T18:40:17Z
- **Completed:** 2026-04-21T18:43:30Z
- **Tasks:** 2 (each TDD — RED + GREEN commits)
- **Files modified:** 4 (all new files — 2 components, 2 test files)

## Accomplishments

- **FreshnessBadge (`src/app/(admin)/admin/jobs/freshness-badge.tsx`)** — client component with two render branches. Fresh: flat muted `<span>` with "Generated {relativeTime}" and optional "· {modelUsed}". Stale: same but prefixed with a `size-1.5 rounded-full bg-warning` dot and wrapped in shadcn `TooltipProvider/Tooltip/TooltipTrigger/TooltipContent` ("Generated N days ago; may need regeneration"). Returns `null` when `relativeTime` is the empty string. Zero `new Date()` calls.
- **SectionErrorBoundary (`src/app/(admin)/admin/jobs/section-error-boundary.tsx`)** — hand-rolled React class component. `getDerivedStateFromError()` flips `hasError` on throw; `componentDidCatch` writes a structured payload (`{ section, jobId, error, stack, componentStack }`) to `console.error` with an `[ai-section]` prefix. Fallback renders a muted `FileText` heading + italic `<p>` with the exact UI-SPEC §3 copy ("Couldn't render this section — the data may have changed shape."). No retry button, no destructive styling, no error detail leaks to DOM.
- **11 new Vitest cases across 2 test files** — 5 for FreshnessBadge (fresh+model, no-model, stale-dot+ARIA, null-when-empty, typography classes) and 6 for SectionErrorBoundary (happy path, fallback copy, server-log payload, boundary isolation, muted-not-destructive styling, per-section labels).
- **Full test suite: 294/294 green (283 baseline + 11 new).** Production build clean.
- **AI-RENDER-02 requirement complete** — "Owner sees `generated_at` timestamp and `model_used` label on every AI artifact section." FreshnessBadge is the visual delivery; Plans 20-05/20-06 wire it into the tailored resume / cover letter / company intel headings.

## Task Commits

Each task committed atomically via the TDD cycle (RED → GREEN):

1. **Task 1 RED: failing FreshnessBadge tests** — `9e9976e` (test)
2. **Task 1 GREEN: FreshnessBadge implementation** — `860c110` (feat)
3. **Task 2 RED: failing SectionErrorBoundary tests** — `debc3c8` (test)
4. **Task 2 GREEN: SectionErrorBoundary implementation** — `3fb9e87` (feat)

_Note: no REFACTOR commits — both GREEN implementations matched UI-SPEC §2/§3 exactly on first pass, no cleanup needed._

## Files Created/Modified

- `src/app/(admin)/admin/jobs/freshness-badge.tsx` (87 lines, created) — reusable client FreshnessBadge
- `src/app/(admin)/admin/jobs/section-error-boundary.tsx` (79 lines, created) — hand-rolled React class SectionErrorBoundary + SECTION_LABELS map
- `src/__tests__/components/freshness-badge.test.tsx` (77 lines, created) — 5 Vitest cases
- `src/__tests__/components/section-error-boundary.test.tsx` (116 lines, created) — 6 Vitest cases

## Decisions Made

All decisions were pre-specified in UI-SPEC §2/§3 and CONTEXT.md D-02/D-09/D-10; the plan action block reproduced them verbatim. Key reinforcements:

- **Hydration-safe props contract:** FreshnessBadge accepts `relativeTime: string`, `isStale: boolean`, `ageDays: number | null`. All three are server-computed. This keeps the component pure-display and dodges the classic Next.js "new Date() on server and client returns different values → hydration mismatch" trap.
- **Hand-rolled ErrorBoundary over react-error-boundary:** CONTEXT.md D-09 already decided this; execution honored it. Zero new deps.
- **`'use client'` on both files:** FreshnessBadge needs it for Tooltip's Radix state; SectionErrorBoundary needs it because React class components cannot run on the Next.js 16 server.
- **Muted over destructive:** both the stale-dot and the error fallback use muted/warning semantics. `text-destructive` stays reserved for Phase 23 regenerate failures (actionable). Phase 20 UI is informational-only.
- **Terminal error fallback:** no "Retry" button. Retry is a Phase 23 concern (once regenerate webhooks exist). Shipping retry here would couple display logic to action UI that doesn't exist yet.

## Deviations from Plan

None — plan executed exactly as written. Both files created verbatim from the plan's action block; both test files created verbatim from the plan's expected test content; no auto-fixes triggered.

One minor post-GREEN edit was made to the SectionErrorBoundary jsdoc to remove a parenthetical `"use client"` reference that made `grep -c '"use client"'` return 2 instead of the acceptance-criterion's expected 1 (cosmetic only — the directive itself was never affected; tests and build were green both before and after the edit).

## Issues Encountered

None.

## User Setup Required

None — both components are drop-in reusable UI primitives. Plans 20-05 and 20-06 import and wire them; no environment variables, no external services, no migrations.

## Next Phase Readiness

- `<FreshnessBadge>` and `<SectionErrorBoundary>` are ready for Plan 20-05 (TailoredResumeSection) to import.
- Plan 20-05 must compute `relativeTime` via `formatDistanceToNow(generated_at)` (date-fns — already a project dep per STACK.md line 9) **server-side** in `fetchJobDetail` (or a wrapping transform) and pass it through as a prop, along with the pre-computed `isStale` boolean and `ageDays` integer.
- Plan 20-06 wires the boundary around each AI artifact section in `job-detail-sheet.tsx`. The `section` prop must be one of `"cover_letter" | "tailored_resume" | "company_research" | "salary_intelligence"` — any other value is a TypeScript error (enforced by the `Section` exported type).
- No blockers.

## Self-Check: PASSED

All claimed files exist on disk:
- `src/app/(admin)/admin/jobs/freshness-badge.tsx` — FOUND
- `src/app/(admin)/admin/jobs/section-error-boundary.tsx` — FOUND
- `src/__tests__/components/freshness-badge.test.tsx` — FOUND
- `src/__tests__/components/section-error-boundary.test.tsx` — FOUND
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-04-SUMMARY.md` — FOUND

All claimed commits exist in `git log`:
- `9e9976e` (test RED, FreshnessBadge) — FOUND
- `860c110` (feat GREEN, FreshnessBadge) — FOUND
- `debc3c8` (test RED, SectionErrorBoundary) — FOUND
- `3fb9e87` (feat GREEN, SectionErrorBoundary) — FOUND

---

## Revision 2026-04-22 — Date-format swap (Phase 21 Plan 00)

FreshnessBadge's `relativeTime: string` prop (emitting "3 days ago" via date-fns `formatDistanceToNowStrict`) was renamed to `generatedDate: string` emitting a formatted `M/D/YY` string (e.g., "4/21/26") produced server-side in `attachFreshness` via `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", day: "numeric", year: "2-digit" })`. Amber stale dot + `isStale` + `ageDays` tooltip behavior all remain pixel-identical. Motivation: CONTEXT.md D-06 (owner preference — factual provenance date beats relative approximation; stale dot still answers "needs regeneration"). See Phase 21 Plan 00 for implementation + test updates.

---

*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
