---
phase: 22-salary-intelligence-defensive-render
plan: 07
subsystem: admin-jobs-render
tags:
  - mount
  - integration
  - provenance-grep-gate
  - currency-guard
  - d-12-cascade
  - ai-render-03
  - ai-render-07

dependency_graph:
  requires:
    - Plan 22-01 — SalaryIntelligenceSchema + CompanyResearch.salary_currency nullable
    - Plan 22-02 — LEFT JOIN LATERAL salary_intelligence + FreshJobDetail.salary_intelligence freshness-wrapped field
    - Plan 22-03 — `?? "USD"` coalesce removed (grep gate G-6)
    - Plan 22-05 — ProvenanceTag component + provenanceColor/provenanceLabel helpers
    - Plan 22-06 — SalaryIntelligenceSection component + EMPTY_STATE_COPY.salary_intelligence
    - Plan 20-06 — SectionErrorBoundary (SECTION_LABELS already contains salary_intelligence key)
  provides:
    - Fifth `<SectionErrorBoundary>` mount site in the job detail sheet (salary_intelligence)
    - Two `<ProvenanceTag>` retrofits (header scraped + Company Intel company_research)
    - D-12 currency-null render guards at both non-salary-section salary figures
    - Grep gate G-1 test-enforcement (every formatSalary( render site has adjacent provenance)
    - Grep gate G-4 test-enforcement (SectionErrorBoundary section="salary_intelligence" wrap)
  affects:
    - AI-RENDER-03 — salary section live at correct mount site (closed)
    - AI-RENDER-07 — every dollar figure on the sheet carries provenance (closed)

tech_stack:
  added: []
  patterns:
    - source-text grep-gate assertion (readFileSync + regex window) as test-enforced architectural invariant
    - inline-fixture drift-guard (Plan 21-06 empty-states.test.tsx precedent) for D-12 guard expressions

key_files:
  created:
    - src/__tests__/components/job-detail-sheet.test.tsx (122 lines; 3 describe blocks, 8 tests)
  modified:
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx (+19 insertions / -7 deletions across 4 regions; full file 374 → 386 lines)

decisions:
  - Single atomic commit for the integration (Task 22-07-03 explicit spec; 2 files — sheet + test)
  - Test file named after the sheet it guards (`job-detail-sheet.test.tsx`) rather than extending `empty-states.test.tsx` — Phase-22-specific grep + D-12 content, low cohesion with AI-RENDER-04 empty-state tests
  - Source-text grep-gate tests over full-Sheet-mount — mount requires fetchJobDetail + Sheet + ScrollArea + TooltipProvider mocking stack; the guards and adjacency invariants live in the source as literal JSX / TS expressions, so readFileSync + regex is the minimum-surface test that fails on drift
  - New `<Separator />` inserted BEFORE the salary SectionErrorBoundary (between Tailored Resume close and new salary mount) rather than AFTER (between salary mount and Company Intel) — existing `<Separator />` already precedes Company Intel (was at old line 262), so inserting a new one maintains the tailored → salary → CI separator rhythm

metrics:
  duration: 2m 52s
  tests_added: 8
  tests_total: 450 (was 442)
  files_modified: 1
  files_created: 1
  commits: 1
  completed: 2026-04-22
---

# Phase 22 Plan 07: Salary Intelligence Defensive Render — Integration Summary

**One-liner:** Mount `<SalaryIntelligenceSection>` between Tailored Resume and Company Intel in `job-detail-sheet.tsx` (wrapped in `<SectionErrorBoundary section="salary_intelligence">`), retrofit the 2 existing `formatSalary(` render sites with `<ProvenanceTag>` (header = scraped, Company Intel = company_research), add D-12 `&& detail.salary_currency` + `&& detail.company_research.salary_currency` hide-block-when-null guards, and lock G-1 / G-4 grep gates into test-enforced source-text assertions.

## What Shipped

**Primary artifact — `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (4 edit regions):**

1. **Imports (lines 39-40):**
   ```typescript
   import { SalaryIntelligenceSection } from "./salary-intelligence-section";
   import { ProvenanceTag } from "./provenance-tag";
   ```

2. **Header salary block (lines 160-167) — D-12 guard + provenance tag:**
   ```tsx
   {formatSalary(detail.salary_min, detail.salary_max) &&
     detail.salary_currency && (
       <span className="flex items-center gap-1">
         <DollarSign className="size-3.5" />
         {formatSalary(detail.salary_min, detail.salary_max)}
         <ProvenanceTag source="scraped" />
       </span>
     )}
   ```
   - Added `&& detail.salary_currency` truthy check — when `salary_currency` is null (today's default state: 100% of 636 live rows) the entire flex row does not render. No `$` symbol ever appears without a currency context.
   - Inserted `<ProvenanceTag source="scraped" />` as the third child of the inherited `gap-1` flex row (UI-SPEC §Integration surface §1 — `gap-1` already provides the 4px "thin space" between the figure and the tag).

3. **SalaryIntelligenceSection mount (lines 266-282) — new section between Tailored Resume and Company Intel:**
   ```tsx
   <Separator />
   <SectionErrorBoundary
     section="salary_intelligence"
     jobId={detail.id}
   >
     <SalaryIntelligenceSection
       salary={
         detail.salary_intelligence
           ? {
               report_json: detail.salary_intelligence.report_json,
               llm_analysis: detail.salary_intelligence.llm_analysis,
               freshness: detail.salary_intelligence.freshness,
             }
           : null
       }
     />
   </SectionErrorBoundary>
   ```
   - New `<Separator />` inserted BEFORE the salary boundary, preserving the existing `<Separator />` that precedes Company Intel. Final visual rhythm: Tailored Resume → sep → Salary Intel → sep → Company Intel → sep → Description.
   - `SectionErrorBoundary` wrap is Plan 20-06's pattern — `SECTION_LABELS` in `section-error-boundary.tsx` already contains `salary_intelligence: "Salary Intelligence"` (verified pre-execution).
   - Prop shape `{ report_json, llm_analysis, freshness }` matches Plan 22-06's `SalaryIntelligenceView` interface exactly. `FreshJobDetail.salary_intelligence` from Plan 22-02 provides the freshness-wrapped object ready for ternary passthrough.

4. **Company Intel salary-range block (lines 343-354) — D-12 guard + provenance tag:**
   ```tsx
   {(detail.company_research.salary_range_min ||
     detail.company_research.salary_range_max) &&
     detail.company_research.salary_currency && (
       <div className="flex items-center gap-1">
         <DollarSign className="size-3.5" />
         {formatSalary(
           detail.company_research.salary_range_min,
           detail.company_research.salary_range_max
         )}
         <ProvenanceTag source="company_research" />
       </div>
     )}
   ```
   - Identical pattern to the header retrofit: currency-null hides the whole block; `<ProvenanceTag source="company_research" />` slots in as the third child of the `gap-1` flex row.

**Secondary artifact — `src/__tests__/components/job-detail-sheet.test.tsx` (new, 122 lines, 3 describe blocks, 8 tests):**

- `describe("job-detail-sheet.tsx — provenance-tag adjacency (grep gate G-1)")` — 4 tests:
  - G-1 iteration: walk the sheet source; for each line matching `formatSalary(` (excluding the function declaration at line 49), assert a `<ProvenanceTag` or `<Badge variant="outline"` appears within the next 5 source lines. Produces unmatched-line-number list as assertion message for diagnostic clarity.
  - `<ProvenanceTag source="scraped" />` appears exactly once (header retrofit).
  - `<ProvenanceTag source="company_research" />` appears exactly once (Company Intel retrofit).
  - G-4 grep gate (multi-line regex): `SectionErrorBoundary` with `section="salary_intelligence"` precedes `<SalaryIntelligenceSection` — tolerates prop ordering and whitespace.

- `describe("job-detail-sheet.tsx — D-12 currency cascade (block hides when currency is null)")` — 2 tests:
  - Header guard expression `formatSalary(detail.salary_min, detail.salary_max) ... && detail.salary_currency` present in source (regex tolerates the line-break formatting prettier applies).
  - Company Intel guard expression `detail.company_research.salary_range_max) ... && detail.company_research.salary_currency` present in source (regex tolerates the multi-line `&&` split).

- `describe("ProvenanceTag smoke tests for the two retrofit sources")` — 2 tests:
  - `source="scraped"` renders Badge with `.text-muted-foreground` + textContent exactly `"scraped"`.
  - `source="company_research"` renders Badge with `.text-success` + textContent exactly `"company research"`.

## Grep Gate Status (Post-Plan-22-07)

| Gate | Source | Status |
|------|--------|--------|
| G-1 provenance adjacency | sheet | ENFORCED (G-1 iteration test; 3 `formatSalary(` render sites all within 5 lines of a tag) |
| G-2 no raw Tailwind colors | sheet + new component | HOLDS (zero hardcoded color tokens in new JSX) |
| G-3 empty-state from EMPTY_STATE_COPY | N/A for this plan | n/a (not a touch point) |
| G-4 SectionErrorBoundary wrap | sheet | ENFORCED (multi-line regex test) |
| G-5 anti-CTA | N/A for this plan | n/a (no copy added) |
| G-6 no `?? "USD"` in jobs-db.ts | jobs-db.ts | HOLDS from Plan 22-03 (0 matches) |
| G-7 tabular-nums | N/A (inherited from Plan 22-06) | n/a (no figure-rendering changes here) |

## Verification

- `npm run build` exits 0 (production build succeeded; only pre-existing Redis + Better Auth + NFT warnings unchanged).
- `npx vitest run src/__tests__/components/job-detail-sheet.test.tsx` → 8/8 pass in 380ms.
- Full suite: `npx vitest run` → 30 files / 450 tests pass in 3.35s (+8 from 442 baseline).
- Acceptance criteria (from Plan 22-07 `<acceptance_criteria>`):
  - `SalaryIntelligenceSection` in sheet: 2 matches (1 import + 1 JSX) — PASS
  - `ProvenanceTag` in sheet: 3 matches (1 import + 2 JSX) — PASS
  - `ProvenanceTag source="scraped"`: 1 match — PASS
  - `ProvenanceTag source="company_research"`: 1 match — PASS
  - `section="salary_intelligence"`: 1 match — PASS
  - `&& detail.salary_currency` header guard: present (line 161) — PASS
  - `&& detail.company_research.salary_currency` CI guard: present (line 345) — PASS
  - `?? "USD"` in jobs-db.ts: 0 matches — PASS (G-6 holds)

## Deviations from Plan

None. Zero Rule 1 / Rule 2 / Rule 3 auto-fixes. Zero Rule 4 architectural escalations.

**Minor nuance:** Plan's `<action>` section described the imports, mount, and guards as 3 separate "edits". The execution landed them as 4 distinct Edit tool calls (imports + header + mount + company intel) matching the 4 edit regions the plan's `<behavior>` section explicitly enumerated. This is narrative detail, not a deviation.

## Dead UI Today (Production Context)

Plan 22-07's shipment is 100% forward-looking regression prevention. As of 2026-04-22:

- **SalaryIntelligenceSection mount:** Always renders its `null` branch because `salary_intelligence` has 0 live rows pending n8n task #11 (`$N` parameter-collision bug upstream). Every job sheet today displays `No salary intelligence yet.` italic in the new section. Populated + empty branches are covered by Plan 22-06's 14-case test file for the day the upstream data lands.
- **Header salary retrofit:** 100% of the 636 live `jobs` rows have `salary_currency = NULL`, so the D-12 guard hides the entire header flex row. The `<ProvenanceTag source="scraped" />` never fires in prod today — it's regression-safe for Phase 23+ when recruiter-triggered scraping populates the field.
- **Company Intel salary retrofit:** 0 live `company_research` rows (100% NULL `company_research_id` in `jobs`), so the D-12 guard hides the entire block. Will come online when Phase 23's owner-triggered research workflow populates rows with Glassdoor / Levels.fyi GBP/EUR data.

## Follow-Ups for Plan 22-08

- Phase 22 meta-doc finalization (REQUIREMENTS.md, ROADMAP.md Phase 22 row, STATE.md phase closure).
- AI-RENDER-03 + AI-RENDER-07 checkboxes should flip — this plan closed both end-to-end at the render layer.
- AI-DATA-01 + AI-DATA-02 already closed by Plans 22-01 / 22-02 / 22-03.
- Phase 22 status should flip to "code-complete; prod UAT deferred to v3.5" matching Phase 21's closure pattern.

## Self-Check: PASSED

Verification checks for claims made in this summary:

- `src/__tests__/components/job-detail-sheet.test.tsx` — verified present (new file, 122 lines)
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — verified modified (+19 / -7; 4 edit regions)
- Commit `1504a61` — verified present in `git log -1` matching `feat(22-07): mount SalaryIntelligenceSection...`
- 8 tests in new file — verified passing via `npx vitest run src/__tests__/components/job-detail-sheet.test.tsx` (8 passed)
- Full suite 450 — verified via `npx vitest run` (450/450 passed, 30 files)
- `npm run build` exits 0 — verified (build succeeded, no errors introduced)
- G-6 in jobs-db.ts — verified 0 matches of `USD` in `src/lib/jobs-db.ts`
