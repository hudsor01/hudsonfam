---
phase: 21
plan: 06
subsystem: admin/jobs
tags: [empty-states, copy-map, predicate, ai-render-04, wave-3]
requires: [21-00, 21-04, 21-05]
provides:
  - EMPTY_STATE_COPY: "6 D-12-locked empty-state strings for all 3 LLM sections"
  - isCompanyResearchEmpty: "Pure predicate; true when every LLM-derived column is null/empty"
  - JobDetailSheet: "Three sections render headings unconditionally; empty-state bodies on missing/empty branches"
  - TailoredResumeSection: "Two empty-state branches replace the old early-return-null behavior"
affects:
  - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
  - src/app/(admin)/admin/jobs/tailored-resume-section.tsx
tech-stack:
  added: []
  patterns:
    - "Three-way ternary inside SectionErrorBoundary (null → missing copy, empty-predicate → empty copy, else → populated content)"
    - "Inline fixture components in tests that mirror production JSX + import same helpers — avoids mounting Sheet + ScrollArea + fetchJobDetail mock stack while still catching production drift (helpers are shared)"
    - "Hooks hoisted above early returns (rules-of-hooks compliance) — useState sits above both empty-state branches in TailoredResumeSection"
key-files:
  created:
    - src/lib/empty-state-copy.ts
    - src/lib/is-company-research-empty.ts
    - src/__tests__/lib/is-company-research-empty.test.ts
    - src/__tests__/components/empty-states.test.tsx
  modified:
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
    - src/app/(admin)/admin/jobs/tailored-resume-section.tsx
    - src/__tests__/components/tailored-resume-section.test.tsx
decisions:
  - "Conservative company_research predicate: row is empty only when all 8 LLM-derived fields are null/empty/[]. Single populated field (even a bad one) fires the rich rendering path. Per UI-SPEC §3 Researcher Note — refine post-Phase-23 when real rows surface."
  - "SectionErrorBoundary wraps the three-way ternary (not individual branches) — empty-state blocks live INSIDE the Plan 20-06 boundary per UI-SPEC §3."
  - "TailoredResumeSection owns its own empty-state branches; job-detail-sheet.tsx simply always renders the wrapper and passes null through. Cover Letter + Company Intel use inline ternaries because the populated render is tightly coupled to detail.* state already in scope."
  - "Plan 20-05's `returns null when resume is null` test assertion rewritten — the test name itself already anticipated Phase 21's contract change (empty-state block instead of null return)."
  - "useState hoisted above the two early-return branches in TailoredResumeSection so hook order is unconditional across renders (rules-of-hooks)."
  - "Doc-comment in empty-state-copy.ts reworded to drop literal `click Research` / `click Regenerate` CTA examples — preserves anti-CTA grep-gate."
metrics:
  duration: "8m 33s"
  completed: "2026-04-22"
---

# Phase 21 Plan 06: Empty-state Blocks Across All 3 LLM Sections Summary

**One-liner:** Distinct empty-state copy on Cover Letter / Tailored Resume / Company Intel sections — six verbatim D-12 strings rendered via a shared `EMPTY_STATE_COPY` const map, with a pure `isCompanyResearchEmpty` predicate gating the "generated but empty" branch; section shells preserved per D-13.

## What Shipped

1. **`src/lib/empty-state-copy.ts`** (new, 28 LoC) — `EMPTY_STATE_COPY` const map exporting the 6 D-12-locked strings as `{ cover_letter: { missing, empty }, tailored_resume: { missing, empty }, company_research: { missing, empty } }`. Greppable, future-i18n-ready, single-source-of-truth for the three sections' voice.

2. **`src/lib/is-company-research-empty.ts`** (new, 37 LoC) — pure predicate `isCompanyResearchEmpty(cr: CompanyResearch): boolean` returning true only when every LLM-derived field is null / whitespace-only / zero-length. Uses `.trim()` on string fields, `length === 0` on `tech_stack`, strict `=== null` on numeric/enum columns.

3. **`src/app/(admin)/admin/jobs/tailored-resume-section.tsx`** (modified) — replaced `if (!resume) return null` with two new early-return branches (after `useState` call to honour rules-of-hooks):
   - `resume === null` → section heading + `"No tailored resume yet."` italic paragraph
   - `!resume.content?.trim()` → section heading + `"Tailored resume was generated but is empty."` italic paragraph
   - Populated branch (unchanged from Plan 21-04: FreshnessBadge + Copy + Download + Streamdown body)

4. **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** (modified) — the three `{detail.X && (<section>...)}` silent-hide patterns replaced with always-render-shell branching inside the existing `SectionErrorBoundary` wraps:
   - Cover Letter: three-way ternary (null / empty-content / populated)
   - Tailored Resume: now always renders the wrapper, passes `null` or shaped view through — `TailoredResumeSection` itself branches internally (step 1)
   - Company Intel: three-way ternary using `isCompanyResearchEmpty` as the empty-body gate
   - Imports added: `EMPTY_STATE_COPY`, `isCompanyResearchEmpty`

5. **`src/__tests__/lib/is-company-research-empty.test.ts`** (new, 16 cases) — 6 verbatim copy-string locks + 10 predicate behaviour cases (all-empty → true; each of 8 fields populated → false; whitespace-only strings → true).

6. **`src/__tests__/components/empty-states.test.tsx`** (new, 10 cases) — TailoredResumeSection tested directly; Cover Letter + Company Intel tested via inline fixtures that mirror the production JSX byte-for-byte and import the same `EMPTY_STATE_COPY` + `isCompanyResearchEmpty` helpers. Assertions cover: exact copy strings present; `text-sm text-muted-foreground italic` body class; FreshnessBadge / Copy button / Download anchor all suppressed in empty branches; populated-branch regression guard.

7. **`src/__tests__/components/tailored-resume-section.test.tsx`** (modified) — Plan 20-05's `returns null when resume is null` assertion updated to the Phase 21 contract: asserts the empty-state block + suppressed Copy/Download. The original test name literally ended with "empty state is Phase 21" — rewrite matches the expressed intent.

## All Six D-12 Strings Render Verbatim (Assertions Locked)

| Section | `missing` string | `empty` string |
|---|---|---|
| Cover Letter | `No cover letter yet.` ✓ | `Cover letter was generated but is empty.` ✓ |
| Tailored Resume | `No tailored resume yet.` ✓ | `Tailored resume was generated but is empty.` ✓ |
| Company Research | `No company research yet.` ✓ | `Company research was generated but is empty.` ✓ |

Each string asserted via `expect(EMPTY_STATE_COPY.*.*).toBe(...)` in `is-company-research-empty.test.ts` (6 cases) and via `container.textContent.toContain(...)` in `empty-states.test.tsx` (6 more cases, across production-component + fixture renders). Any accidental rephrasing would fail both suites.

## Test Counts

- Before: 369 passing (end of Plan 21-07)
- After: **395 passing** (+26 = 16 Task 1 + 10 Task 2)
- Test files: 25 → 27 (+2 new: `is-company-research-empty.test.ts`, `empty-states.test.tsx`)
- Full suite duration: ~3.9s

## Verification Gates

- [x] `npm test -- src/__tests__/lib/is-company-research-empty.test.ts --run` — 16/16 passing (274ms)
- [x] `npm test -- src/__tests__/components/empty-states.test.tsx --run` — 10/10 passing
- [x] `npm test -- --run` — 395/395 passing, 27 test files
- [x] `npm run build` — exit 0 (`✓ Compiled successfully in 3.0s`); only pre-existing warnings (Redis ENOTFOUND, Better Auth env-not-set, Next.js 16 NFT, url.parse DEP0169) — none introduced by this plan
- [x] `grep -c "EMPTY_STATE_COPY" job-detail-sheet.tsx` = 5 (≥ 3 required)
- [x] `grep -c "EMPTY_STATE_COPY" tailored-resume-section.tsx` = 3 (≥ 2 required)
- [x] `grep -c "isCompanyResearchEmpty" job-detail-sheet.tsx` = 2 (≥ 1 required)
- [x] `grep -c "text-sm text-muted-foreground italic" job-detail-sheet.tsx` = 4 (≥ 2 required, 2 per section × 2 emptiable sections = 4)
- [x] `grep -c "text-sm text-muted-foreground italic" tailored-resume-section.tsx` = 2 (= missing + empty branches)
- [x] `grep -c "detail.cover_letter && \("` job-detail-sheet.tsx = 0 — silent-hide pattern fully removed
- [x] No hardcoded Tailwind colors in `src/app/(admin)/admin/jobs/` or `src/lib/` (empty-match from grep)
- [x] Zero `click research` / `click regenerate` strings in `empty-state-copy.ts`

## Deviations from Plan

### Rule 1 — Fix: stale assertion in tailored-resume-section.test.tsx

- **Found during:** Task 2 GREEN phase
- **Issue:** Plan 20-05's test `returns null when resume is null (Phase 20 hides section; empty state is Phase 21)` asserted `container.firstChild).toBeNull()`. After wiring the empty-state branches, that assertion fails (correctly — the whole point of Plan 21-06 is that `resume === null` no longer returns null). The test name itself explicitly anticipates the Phase 21 contract change.
- **Fix:** Rewrote the single `it()` block to assert the Phase 21 contract: section heading + "No tailored resume yet." text present, Copy button + Download anchor suppressed. Renamed: `renders the AI-RENDER-04 empty-state block when resume is null (Phase 21 Plan 06)`.
- **Files modified:** `src/__tests__/components/tailored-resume-section.test.tsx`
- **Commit:** d6446c1 (consolidated with Task 2)

### Rule 3 — Fix: doc-comment example strings tripping the anti-CTA grep gate

- **Found during:** post-Task-2 acceptance-criteria verification
- **Issue:** `empty-state-copy.ts` doc comment originally said `references to Phase 23 triggers ("click Research", "click Regenerate")` as a meta-warning about what NOT to put in the strings. That's semantically correct, but it tripped the plan's `grep -Ein "click (research|regenerate)" src/lib/empty-state-copy.ts` acceptance criterion which returned 1 match.
- **Fix:** Reworded comment to `references to Phase-23-era UI triggers that do not exist yet` — same meaning, zero false-positives.
- **Files modified:** `src/lib/empty-state-copy.ts`
- **Commit:** d6446c1 (consolidated with Task 2)

## Researcher Note #3 Deferral

The `isCompanyResearchEmpty` predicate ships with the conservative "all-fields-null" definition from UI-SPEC §3 — see the doc comment in `src/lib/is-company-research-empty.ts` for the full rationale.

Today: 0 `company_research` rows exist in production. The predicate's "generated but empty" branch is dead UI until Phase 23 (Owner-Triggered Workflows) lands the manual research trigger. Once real rows surface, Phase 23's planner should refine the predicate — most likely adding "sentinel strings count as empty" (e.g. `ai_summary === "Could not find info"` → treat as empty). Until then, a single populated field — even a bad one — fires the rich rendering path, which gives the owner the most information.

No action needed for Plan 21-06. The refinement surface is narrow (one pure function, one test file of ~10 cases) — cheap to iterate when the signal appears.

## Key Decisions

See frontmatter `decisions:` for the full list. Top three:

1. **Conservative company_research predicate shipped as-is** — trade dead-UI risk today for correct semantics when real rows land (refine post-Phase-23).
2. **SectionErrorBoundary wraps the three-way ternary, not individual branches** — empty-state blocks live INSIDE the Plan 20-06 boundary so a render error in an empty block would still fall back to the dimmed boundary UI. Satisfies UI-SPEC §3.
3. **TailoredResumeSection owns its own empty-state branches** — job-detail-sheet.tsx becomes a thin always-render wrapper that passes null through. Cover Letter + Company Intel stay inline because their populated render is tightly coupled to `detail.cover_letter.*` / `detail.company_research.*` state already in scope; extracting them to components would require prop-drilling freshness + quality-score + tech-stack arrays.

## Follow-ups (for Plans 21-08 / 21-09)

- UAT task 21-08 should verify the empty-state bodies render correctly against a synthetic `UPDATE cover_letters SET content = '' WHERE id = <test>` row. Company Intel's empty branch is dead UI until Phase 23, so UAT can either (a) synthesize a row via SQL insert and verify, or (b) defer that UAT item to Phase 23's first UAT cycle.
- Plan 21-04's SUMMARY flagged the cover-letter `Download PDF` anchor (lines ~204-211 in job-detail-sheet.tsx after this plan) as missing a `focus-visible:ring` — still present as a fix-forward opportunity for the next touch of that block. Not a Plan 21-06 concern.

## Commits

- `c936e26` — Task 1: `feat(21-06): add empty-state copy map + is-company-research-empty predicate`
- `d6446c1` — Task 2: `feat(21-06): render empty-state bodies for all 3 LLM sections`

## Self-Check: PASSED

- [x] `src/lib/empty-state-copy.ts` exists
- [x] `src/lib/is-company-research-empty.ts` exists
- [x] `src/__tests__/lib/is-company-research-empty.test.ts` exists
- [x] `src/__tests__/components/empty-states.test.tsx` exists
- [x] Commit c936e26 exists in git log
- [x] Commit d6446c1 exists in git log
- [x] 395/395 full-suite tests passing
- [x] `npm run build` exits 0
