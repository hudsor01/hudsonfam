---
phase: 21
plan: 00
subsystem: admin/jobs (LLM artifact freshness rendering)
tags:
  - phase-20-revision
  - freshness
  - i18n-datetime
  - hydration-safety
  - prop-rename
dependency_graph:
  requires:
    - Plan 20-04 (FreshnessBadge component)
    - Plan 20-05 (TailoredResumeSection internal FreshnessBadge mount)
    - Plan 20-06 (attachFreshness helper + fetchJobDetail integration)
  provides:
    - "FreshnessBadge accepting generatedDate: string prop (formal M/D/YY date)"
    - "attachFreshness helper in its own module, importable by tests and Server Action callers"
    - "ArtifactFreshness + ResumeFreshness interfaces with generatedDate field"
  affects:
    - "Phase 21 Plans 21-04, 21-05, 21-06 — will consume generatedDate prop for empty-state + quality-badge renders"
tech_stack:
  added:
    - "Intl.DateTimeFormat (native Node.js / browser API — zero npm deps)"
  patterns:
    - "Server-computed freshness primitives (generatedDate, isStale, ageDays) pass through as props — client never calls new Date() (hydration-safe, UI-SPEC §Pattern 2)"
    - "Extract non-async helpers from \"use server\" files into dedicated modules (Next.js 16 compilation constraint)"
key_files:
  created:
    - "src/lib/attach-freshness.ts — attachFreshness helper + DATE_FMT constant"
    - "src/__tests__/lib/attach-freshness.test.ts — 5 frozen-clock vitest cases"
  modified:
    - "src/app/(admin)/admin/jobs/freshness-badge.tsx — relativeTime -> generatedDate prop rename"
    - "src/app/(admin)/admin/jobs/tailored-resume-section.tsx — ResumeFreshness interface + internal FreshnessBadge mount"
    - "src/app/(admin)/admin/jobs/job-detail-sheet.tsx — 2 FreshnessBadge mounts (Cover Letter + Company Intel)"
    - "src/lib/job-actions.ts — drop formatDistanceToNowStrict + DATE_FMT; import attachFreshness from dedicated module"
    - "src/lib/jobs-db.ts — ArtifactFreshness.relativeTime -> generatedDate"
    - "src/__tests__/components/freshness-badge.test.tsx — 5 cases rewritten with frozen 4/21/26-style date assertions"
    - "src/__tests__/components/tailored-resume-section.test.tsx — fixtures migrated to generatedDate"
    - ".planning/phases/20-foundation-freshness-zod-tailored-resume/20-04-SUMMARY.md — revision annotation footer"
    - ".planning/phases/20-foundation-freshness-zod-tailored-resume/20-06-SUMMARY.md — revision annotation footer"
decisions:
  - "DATE_FMT + attachFreshness live in src/lib/attach-freshness.ts (not job-actions.ts) — Next.js 16 \"use server\" files allow only async exports; the Rule 3 fix extracts the helper to a dedicated module. Same behavior, compile-safe."
  - "Chicago DST edge test (created_at at 2026-04-21T05:00:00Z) asserts generatedDate='4/21/26' — verifying America/Chicago = UTC-5 (CDT) at that boundary so company_research rows ingested just past midnight UTC format to the same US-civil calendar day."
  - "Test import path uses @/lib/attach-freshness (direct import) rather than going through @/lib/job-actions — fetchJobDetail remains the sole production caller of attachFreshness; re-export through the Server Action file would pull the whole \"use server\" machinery into the test module."
  - "Null-branch behavior unified: an empty generatedDate string hides the FreshnessBadge entirely — matches Plan 20-04 cadence (empty relativeTime was also the hide signal). Preserves the fail-open path: NaN date -> zeroed freshness -> hidden badge, never a thrown exception."
metrics:
  duration: "~22 minutes (incl. Rule 3 build-gate deviation and its extraction + re-verification)"
  completed_date: "2026-04-22T02:02:00Z"
  task_count: 3
  file_count: 9
  commit_hashes:
    - "cb23ac9 (Task 1: attachFreshness Intl.DateTimeFormat swap + field rename)"
    - "431e1a5 (Task 2: FreshnessBadge prop + callers + test fixtures)"
    - "6bfc6da (Task 3: Plan 20-04 + 20-06 summaries revision annotation)"
    - "d2c8df7 (fix: extract attachFreshness to own module — Rule 3 build-gate auto-fix)"
  baseline_tests: 305
  final_tests: 310
  net_new_tests: 5
---

# Phase 21 Plan 00: FreshnessBadge Date-Format Revision Summary

**One-liner:** Bundled Phase 20 revision — swapped FreshnessBadge's `relativeTime: "3 days ago"` prop for a formal `generatedDate: "4/21/26"` prop computed server-side via `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", ... })`; amber stale dot + `ageDays` tooltip logic unchanged.

## What Was Built

### Task 1 — `attachFreshness` helper swap + `ArtifactFreshness` rename

- **`src/lib/job-actions.ts`** — dropped `import { formatDistanceToNowStrict } from "date-fns"` and replaced the relative-time computation with `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", day: "numeric", year: "2-digit" }).format(generated)`. NaN fail-open path (malformed ISO → `generatedDate: ""`) preserved. Dual-field dispatch on `"generated_at" in artifact` (cover letter + tailored resume) vs `created_at` (company research) unchanged.
- **`src/lib/jobs-db.ts`** — `ArtifactFreshness.relativeTime: string` → `generatedDate: string`. `FreshJobDetail`'s nested freshness shape is now `{ generatedDate, isStale, ageDays }` everywhere.
- **`src/__tests__/lib/attach-freshness.test.ts`** — new file with 5 frozen-clock cases:
  1. happy path (`generated_at` 3 days before now → `4/18/26`, `ageDays: 3`, not stale)
  2. null artifact → `null`
  3. unparseable ISO → fail-open `{ generatedDate: "", isStale: false, ageDays: 0 }`
  4. `created_at` dispatch (company_research branch) with a Chicago DST edge (2026-04-21T05:00Z = 00:00 Chicago → `4/21/26`)
  5. stale threshold boundary (20 days old, 14-day threshold → `isStale: true`, `ageDays: 20`)

### Task 2 — `FreshnessBadge` prop rename + all 3 callers + test fixture updates

- **`src/app/(admin)/admin/jobs/freshness-badge.tsx`** — prop `relativeTime: string` → `generatedDate: string`; destructure + null-guard + JSX text (`Generated {generatedDate}`); JSDoc updated. Amber stale dot (`size-1.5 rounded-full bg-warning`), `aria-label="Stale artifact"`, middle-dot separator, stale tooltip copy (`Generated {ageDays} days ago; may need regeneration`), typography classes (`text-[11px] font-medium text-muted-foreground`), and TooltipProvider wrapping in the stale branch — **all unchanged**.
- **`src/app/(admin)/admin/jobs/tailored-resume-section.tsx`** — `ResumeFreshness.relativeTime` → `generatedDate`; internal FreshnessBadge mount updated.
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** — 2 external FreshnessBadge mounts renamed (lines ~151 Cover Letter + ~205 Company Intel).
- **`src/__tests__/components/freshness-badge.test.tsx`** — 5 cases rewritten to pass `generatedDate="4/21/26"` / `"4/19/26"` / `"4/16/26"` / `""` in place of the previous relative-time strings. `it(...)` descriptions also updated (`"renders fresh state with formatted date and model"`). Typography + stale-dot + null-branch assertions unchanged.
- **`src/__tests__/components/tailored-resume-section.test.tsx`** — `freshView` + `staleView` fixtures migrated to `generatedDate`; one `it` description + assertion updated from `"relative time"` / `"Generated 3 hours ago"` to `"formatted date"` / `"Generated 4/21/26"`.

### Task 3 — Retroactive revision annotation on Phase 20 summaries

- **`.planning/phases/20-foundation-freshness-zod-tailored-resume/20-04-SUMMARY.md`** — appended `## Revision 2026-04-22 — Date-format swap (Phase 21 Plan 00)` footer noting the FreshnessBadge prop rename + rationale (D-06 owner preference).
- **`.planning/phases/20-foundation-freshness-zod-tailored-resume/20-06-SUMMARY.md`** — appended the same-style footer noting the `attachFreshness` helper's formatter swap.
- Footer H2 is greppable (`grep -c "Revision 2026-04-22"` returns 1 in each file) and both point readers to Phase 21 Plan 00 for implementation + test details. Existing content fully preserved.

## Test Results

- **Baseline (pre-plan):** 305 tests passing across 18 test files (verified at `2026-04-22T01:54:21Z` before Task 1 began).
- **Final (post-plan):** 310 tests passing across 19 test files. Duration ~1.1 s, all suites stable.
- **Net new:** 5 unit tests — `src/__tests__/lib/attach-freshness.test.ts` covers the Intl.DateTimeFormat output, null passthrough, fail-open NaN branch, created_at dispatch path, and stale threshold boundary. No reduction in other test counts (prop-rename replaced existing assertions 1-for-1 in `freshness-badge.test.tsx` and `tailored-resume-section.test.tsx`).
- **Production build:** `npm run build` exits 0. Static pages 25/25 generated. Only pre-existing warnings present (next.config.ts NFT Turbopack warning, Redis ENOTFOUND on homelab DNS, Better Auth env-not-set) — identical set to the Phase 20 plan builds in STATE.md history.

## Deviations from Plan

### Rule 3 — Blocking issue auto-fix

**1. `attachFreshness` extracted to its own module**

- **Found during:** Task 1's verification gate re-run (`npm run build` after committing the inline export)
- **Issue:** Next.js 16 / Turbopack rejects production compilation of `"use server"` files that export non-async functions:
  ```
  x Only async functions are allowed to be exported in a "use server" file
    ./src/lib/job-actions.ts:58:17
  ```
  Vitest passed because the jsdom environment doesn't enforce Server Actions' shape constraints, but the production build gate caught it immediately.
- **Fix:** Moved `attachFreshness` + the `DATE_FMT` constant to a new `src/lib/attach-freshness.ts` module (plain TypeScript, no `"use server"` directive). `job-actions.ts` now imports `attachFreshness` from that module for the `fetchJobDetail` call site; the test file imports from the same path. Behavior bit-for-bit preserved — same generic signature, same dual-field dispatch, same NaN fail-open, same `Intl.DateTimeFormat(America/Chicago)` output. 310/310 tests still green; `npm run build` exits 0.
- **Files modified:** `src/lib/attach-freshness.ts` (new, 57 lines), `src/lib/job-actions.ts` (removed 46 lines of helper + DATE_FMT, added 1 line import), `src/__tests__/lib/attach-freshness.test.ts` (import path retargeted)
- **Commit:** `d2c8df7`
- **Plan implication:** The plan spec said "Change the function signature at line 48 from `function attachFreshness<T ...>` to `export function attachFreshness<T ...>` — add the `export` keyword so the test file can import it." That specific approach is not compatible with Next.js 16's Server Actions compile constraints. The production fix (dedicated module) achieves the same testability goal without violating the runtime contract. All plan acceptance criteria still hold except the trivial "grep job-actions.ts for `export function attachFreshness` → 1 match" check, which is now satisfied via the dedicated module instead.

### Note on Intl.DateTimeFormat / America/Chicago match count

Plan acceptance criteria specified:
- `grep -n "Intl.DateTimeFormat" src/lib/job-actions.ts` → exactly one match
- `grep -n "America/Chicago" src/lib/job-actions.ts` → exactly one match

After the Rule 3 extraction, `job-actions.ts` no longer contains either pattern (zero matches). Both are now in `src/lib/attach-freshness.ts` — exactly one match each, satisfying the spirit of the criterion ("one production callsite, not sprinkled across the codebase") at the new location.

## Known Stubs

None. The plan was a prop-rename + formatter swap; no stubs were introduced and no pre-existing stubs were affected.

## Threat Flags

None. This plan introduced no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The plan's `<threat_model>` block (T-21-00-01 Information Disclosure, T-21-00-02 hydration mismatch, T-21-00-03 DoS on malformed timestamp) all remain fully mitigated:

- T-21-00-02 (hydration mismatch from client-side clock): `generatedDate` is a server-computed primitive; `FreshnessBadge` contains no `new Date()` / `toLocaleDateString()` / `Date.now()` calls. Verified by inspection.
- T-21-00-03 (malformed `generated_at`): `attachFreshness` still returns `{ generatedDate: "", isStale: false, ageDays: 0 }` on `Number.isNaN(generated.getTime())`, and `FreshnessBadge`'s empty-`generatedDate` guard returns `null`. Verified by test case 3 in `attach-freshness.test.ts`.

## Follow-ups for Downstream Wave 3 Plans

- **Plan 21-04 (Tailored Resume copy + download action row):** Will consume `resume.freshness.generatedDate` via the existing `TailoredResumeSection` → `FreshnessBadge` path. Prop shape locked in this plan; Wave 3 work is purely additive (new Copy button + Download link beside the badge). No further refactor needed in the freshness-badge component.
- **Plan 21-05 (Cover Letter quality-score badge):** The new quality `Badge` sits *left of* `FreshnessBadge` in the cover-letter meta row (UI-SPEC §2, CONTEXT.md D-17). Wave 3 caller passes `generatedDate={detail.cover_letter.freshness.generatedDate}` unchanged — this plan already updated that mount site.
- **Plan 21-06 (Empty states):** When `detail.cover_letter === null` or equivalent, the empty-state block renders and FreshnessBadge is *not* mounted (UI-SPEC §3). The null-branch behavior of `FreshnessBadge` (empty `generatedDate` → returns null) is a defensive double-guard — the section's conditional renders already prevent the badge from mounting in empty-data paths. No Wave 3 follow-up needed.
- **Phase 22 / 23 / 24:** Any future `FreshnessBadge` mount must pass `generatedDate`, not `relativeTime`. The prop rename is reflected in the component's exported TypeScript prop interface, so TypeScript will catch any stale caller at compile time.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `cb23ac9` | `refactor(21-00): swap attachFreshness to Intl.DateTimeFormat(America/Chicago)` |
| 2 | `431e1a5` | `refactor(21-00): rename FreshnessBadge relativeTime -> generatedDate across callers` |
| 3 | `6bfc6da` | `docs(21-00): annotate Plan 20-04 + 20-06 summaries with revision footer` |
| (Rule 3 fix) | `d2c8df7` | `fix(21-00): extract attachFreshness to its own module (Rule 3 auto-fix)` |

## Self-Check: PASSED

### Files exist

- `src/lib/attach-freshness.ts` — FOUND
- `src/__tests__/lib/attach-freshness.test.ts` — FOUND
- `src/app/(admin)/admin/jobs/freshness-badge.tsx` — FOUND (modified)
- `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — FOUND (modified)
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — FOUND (modified)
- `src/lib/job-actions.ts` — FOUND (modified)
- `src/lib/jobs-db.ts` — FOUND (modified)
- `src/__tests__/components/freshness-badge.test.tsx` — FOUND (modified)
- `src/__tests__/components/tailored-resume-section.test.tsx` — FOUND (modified)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-04-SUMMARY.md` — FOUND (appended)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-06-SUMMARY.md` — FOUND (appended)

### Commits in git log

- `cb23ac9` — FOUND
- `431e1a5` — FOUND
- `6bfc6da` — FOUND
- `d2c8df7` — FOUND

### Verification gates

- `npm test -- --run` → 310 passed (310), 19 test files passed — FOUND
- `npm run build` → exit 0, 25/25 static pages generated — FOUND
- `grep -rn "relativeTime" src/` → 0 matches — FOUND (scope cleared)
- `grep "formatDistanceToNowStrict" src/lib/job-actions.ts` → 0 matches — FOUND (import removed)
- `grep -c "Revision 2026-04-22" 20-04-SUMMARY.md` → 1 — FOUND
- `grep -c "Revision 2026-04-22" 20-06-SUMMARY.md` → 1 — FOUND

---

*Phase: 21-polish-copy-pdf-empty-states-link-out*
*Completed: 2026-04-22*
