---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 06
subsystem: ui
tags: [nextjs, react, server-actions, date-fns, freshness, error-boundary, streamdown, integration]

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: [isStale + STALE_THRESHOLDS (Plan 02), parseOrLog schemas (Plan 03), FreshnessBadge + SectionErrorBoundary (Plan 04), TailoredResumeSection (Plan 05)]
provides:
  - fetchJobDetail returns FreshJobDetail with per-artifact freshness attached server-side
  - attachFreshness<T> helper dispatching on generated_at vs created_at
  - Job detail sheet renders all three LLM artifact sections (Cover Letter, Tailored Resume, Company Intel) wrapped in SectionErrorBoundary with FreshnessBadge
  - Tailored Resume finally visible in the UI — end-to-end delivery of AI-RENDER-01
affects: [phase-21-polish, phase-22-salary-intelligence, phase-23-owner-triggered-workflows]

# Tech tracking
tech-stack:
  added: []  # All deps pre-existed (date-fns@^4.1.0, streamdown via Plan 01)
  patterns:
    - "Server-side freshness attachment (attachFreshness helper) — all relativeTime/isStale/ageDays computed before serialization edge"
    - "Per-section SectionErrorBoundary wrap — one failing LLM artifact never blanks the whole detail sheet"
    - "FreshJobDetail is additive, never modifies JobDetail — Omit<JobDetail, X> + replacement fields preserves backward-compat"

key-files:
  created: []
  modified:
    - src/lib/jobs-db.ts
    - src/lib/job-actions.ts
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx

key-decisions:
  - "attachFreshness dispatches via `'generated_at' in artifact` narrow — handles both field names (cover_letter/tailored_resume vs company_research) without a schema-level transform (RESEARCH.md §Q2 RESOLVED)"
  - "FreshJobDetail uses Omit + union replacement so JobDetail stays intact for other callers (e.g. downstream consumers that don't need freshness)"
  - "Company Intel's FreshnessBadge gets modelUsed={null} — the company_research table has no model_used column; badge correctly drops the separator and model text"
  - "Cover Letter keeps whitespace-pre-wrap rendering — migrating to markdown is explicitly out of Phase 20 scope; only Tailored Resume uses Streamdown"
  - "attachFreshness silently zeroes freshness on unparseable ISO strings rather than throwing — matches D-11 fail-open invariant (bad row ≠ crashed page)"
  - "Tailored Resume's FreshnessBadge lives INSIDE TailoredResumeSection (Plan 05 already wired it) — sheet only mounts 2 FreshnessBadges externally"

patterns-established:
  - "Pre-compute hydration-sensitive values server-side: Date.now() + isStale() + formatDistanceToNowStrict in the Server Action, send primitives to client"
  - "Integration-plan shape: Tasks 02-05 build components/utils in isolation; Task 06 wires them into a single page — verification grep-counts import sites and JSX usages"

requirements-completed: [AI-RENDER-01, AI-RENDER-02]

# Metrics
duration: 2m 35s
completed: 2026-04-21
---

# Phase 20 Plan 06: Wire freshness + Tailored Resume into job-detail-sheet Summary

**Job detail sheet now renders all three LLM artifacts (Cover Letter, Tailored Resume, Company Intel) wrapped in per-section error boundaries with server-computed FreshnessBadges — delivers AI-RENDER-01 end-to-end and completes AI-RENDER-02 across every AI section.**

## Performance

- **Duration:** 2m 35s
- **Started:** 2026-04-21T19:13:13Z
- **Completed:** 2026-04-21T19:15:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `fetchJobDetail` now returns a `FreshJobDetail` — each of the three LLM artifacts (cover_letter, tailored_resume, company_research) carries a pre-computed `freshness: { relativeTime, isStale, ageDays }` field; client never runs `new Date()` during render (hydration-safe).
- `attachFreshness<T>` helper reads `generated_at` OR `created_at` via type-narrowing (`'generated_at' in artifact`) — solves RESEARCH.md §Q2 without touching the Zod schemas.
- `job-detail-sheet.tsx` mounts `TailoredResumeSection` between Cover Letter and Company Intel (per UI-SPEC §1 placement order), wraps all three LLM sections in `SectionErrorBoundary`, and places `FreshnessBadge` on Cover Letter (14d threshold, model shown) and Company Intel (60d threshold, `modelUsed={null}` because the table has no `model_used` column).
- TypeScript `FreshJobDetail` is additive (`extends Omit<JobDetail, ...>`) — `JobDetail` remains unchanged for any other consumer.
- All 305 tests remain green; production build clean; zero hardcoded Tailwind colors introduced.

## Task Commits

Each task was committed atomically:

1. **Task 1: Attach server-side freshness in fetchJobDetail** — `74ff97c` (feat)
2. **Task 2: Wire TailoredResumeSection + FreshnessBadge + SectionErrorBoundary into job-detail-sheet.tsx** — `670961e` (feat)

## Files Created/Modified

- `src/lib/jobs-db.ts` — Added `ArtifactFreshness` interface + `FreshJobDetail extends Omit<JobDetail, "cover_letter" | "tailored_resume" | "company_research">` with freshness-enriched replacements for each LLM artifact. `JobDetail` itself kept intact.
- `src/lib/job-actions.ts` — Added `attachFreshness<T>` helper (dispatches on `generated_at` vs `created_at` via type narrowing), imports `formatDistanceToNowStrict` from date-fns + `isStale`/`STALE_THRESHOLDS` from `./job-freshness`, and `fetchJobDetail` now returns `Promise<FreshJobDetail | null>` with 3 `attachFreshness` call sites (14d / 14d / 60d thresholds per CONTEXT.md D-01).
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — State type switched to `FreshJobDetail`; imports added for `FreshnessBadge`, `SectionErrorBoundary`, `TailoredResumeSection`; all three LLM sections wrapped in `SectionErrorBoundary` with correct `section` prop; `<FreshnessBadge>` mounted externally on Cover Letter (with model) and Company Intel (modelUsed=null); `<TailoredResumeSection>` inserted between Cover Letter and Company Intel with its own internal freshness badge; PDF download link preserved as a sibling of the Cover Letter FreshnessBadge (not nested inside it).

## Decisions Made

- **attachFreshness with field-name dispatch over schema-level transform:** handles both `generated_at` (cover_letter, tailored_resume) and `created_at` (company_research) with a single helper rather than forcing a schema transform or renaming DB columns. Resolves RESEARCH.md §Q2.
- **FreshJobDetail is additive, JobDetail unchanged:** any other consumer (e.g. a future server render outside the admin sheet) keeps working without freshness plumbing.
- **Cover Letter keeps whitespace-pre-wrap (not Streamdown):** migrating cover letter to markdown is out of Phase 20 scope. Only Tailored Resume uses Streamdown (per Plan 05 scope).
- **Company Intel FreshnessBadge gets `modelUsed={null}`:** the `company_research` table has no `model_used` column — badge's null-branch correctly drops the separator and model text.
- **2 external FreshnessBadge mounts, not 3:** Tailored Resume's badge is rendered internally by `TailoredResumeSection` (Plan 05 wired it). `grep -c '<FreshnessBadge'` correctly yields 2 in `job-detail-sheet.tsx`.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria verified via grep counts. No Rule 1/2/3 auto-fixes triggered; no Rule 4 architectural questions raised.

## Issues Encountered

None. Build passed first-try; 305/305 tests green on first run.

## User Setup Required

None — no external service configuration required. Freshness is pure server compute; date-fns was already installed at ^4.1.0.

## Next Phase Readiness

- **Phase 20 is now complete (8/8 plans).** All Phase 20 requirements satisfied: AI-RENDER-01, AI-RENDER-02, AI-SAFETY-01, AI-SAFETY-05, AI-SAFETY-06, AI-DATA-03, AI-DATA-04.
- Phase 21 (Polish) can begin. Its copy-to-clipboard + PDF download buttons for Tailored Resume have a stable JSX landing pad in `<TailoredResumeSection>` — Phase 21 will extend, not refactor.
- Phase 22 (Salary Intelligence) can begin in parallel. When it adds a `salary_intelligence` artifact to `JobDetail`, the same `attachFreshness` helper and `SectionErrorBoundary` wrap pattern applies — `STALE_THRESHOLDS.salary_intelligence = 30` is already defined.
- Phase 23 (Owner-Triggered Workflows) regenerate buttons will drop into each section's heading row alongside the existing FreshnessBadge (right-justified in the same flex row) — no structural changes needed.

## Self-Check: PASSED

- [x] `src/lib/jobs-db.ts` modified — `export interface ArtifactFreshness` and `export interface FreshJobDetail` present; `interface JobDetail` unchanged
- [x] `src/lib/job-actions.ts` modified — `attachFreshness` defined + 3 call sites; `fetchJobDetail` returns `Promise<FreshJobDetail | null>`
- [x] `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` modified — all 3 imports added (FreshnessBadge, SectionErrorBoundary, TailoredResumeSection); state type switched to FreshJobDetail; all 3 section boundaries mounted with correct `section` prop
- [x] Commit `74ff97c` exists in git log
- [x] Commit `670961e` exists in git log
- [x] `npm run build` exits 0
- [x] `npm test` exits 0 with 305/305 passing
- [x] No hardcoded Tailwind color names introduced

---

## Revision 2026-04-22 — Date-format swap (Phase 21 Plan 00)

`attachFreshness` was updated to emit `generatedDate: "M/D/YY"` (America/Chicago) instead of `relativeTime: "N days ago"`. The helper still handles both `generated_at` (cover_letter, tailored_resume) and `created_at` (company_research) via the same `"generated_at" in artifact` type-narrowing; only the formatted-string field changed. `FreshJobDetail`'s nested freshness shape is therefore now `{ generatedDate, isStale, ageDays }`. See Phase 21 Plan 00 for implementation + test updates + the 5-case `attachFreshness` unit test introduced as part of the revision.

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
