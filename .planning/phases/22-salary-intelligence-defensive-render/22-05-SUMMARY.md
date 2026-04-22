---
phase: 22-salary-intelligence-defensive-render
plan: 05
subsystem: ui
tags:
  - provenance
  - pure-function
  - badge
  - tooltip
  - ai-render-07

requires:
  - phase: 21-ai-artifact-polish
    provides: src/lib/score-color.ts pattern (Plan 21-05 scoreColor/scoreLabel pure-function pair + inline Badge+Tooltip JSX shape at job-detail-sheet.tsx lines 206-218) — exact mirror target for provenance.ts and provenance-tag.tsx
provides:
  - ProvenanceSource type union (4 sources — scraped / llm / company_research / original_posting) at src/lib/provenance.ts
  - provenanceColor(source) pure function mapping 4 sources → 3 semantic Tailwind tokens (text-muted-foreground / text-warning / text-success) per D-10 color≈confidence
  - provenanceLabel(source) pure function returning verbatim UI-SPEC §Copywriting-Contract labels (scraped / LLM estimate / company research / posted)
  - ProvenanceTag({source, className?}) client component — shadcn Badge variant="outline" wrapping Radix Tooltip with 4 verbatim TOOLTIPS strings; text-[10px] one-size-smaller per D-10
affects:
  - Plan 22-06 (SalaryIntelligenceSection) — will import ProvenanceTag + render <ProvenanceTag source="llm" /> on every headline figure
  - Plan 22-07 (job-detail-sheet.tsx retrofits) — will render <ProvenanceTag source="scraped" /> after header salary + <ProvenanceTag source="company_research" /> after Company Intel salary range
  - Plan 22-07 grep-gate G-1 (adjacency between any "$X" figure and a <ProvenanceTag>) — gate will pass once consumers land

tech-stack:
  added: []
  patterns:
    - "Pure-function pair for scale/classification mapping (mirrors src/lib/score-color.ts — zero-import module safe for Server + Client Components)"
    - "Exhaustive switch over a string-union type so TS flags a 5th source without a default branch"
    - "Badge+Tooltip reusable primitive for metadata tags (external wrapper around Plan 21-05's inline JSX shape — eliminates drift across 3+ call sites)"

key-files:
  created:
    - src/lib/provenance.ts
    - src/__tests__/lib/provenance.test.ts
    - src/app/(admin)/admin/jobs/provenance-tag.tsx
  modified: []

key-decisions:
  - "Switch statement over if/else for provenanceColor + provenanceLabel — exhaustiveness check is the safety net against future 5th-source drift (TS compiler, not tests, is the tripwire)."
  - "original_posting reuses text-muted-foreground (not its own token) — D-10 intentionally maps 4 sources to 3 tokens because scraped + original_posting are both low-trust feed data; no visual disambiguation needed at Phase 22."
  - "TOOLTIPS const map lives inside provenance-tag.tsx, not src/lib/provenance.ts — keeps provenance.ts zero-import-pure (usable server-side), while the tooltip copy stays colocated with its only renderer."
  - "No aria-label on Badge — the visible label text IS the accessible name. Radix wraps the TooltipTrigger in a focusable element so keyboard + SR users get the tooltip content automatically."
  - "className prop appended via template-literal concatenation (not cn() utility) — matches Plan 21-05 inline pattern and avoids pulling @/lib/utils into a leaf primitive."
  - "text-[10px] Badge sizing (one step smaller than Plan 21-05's text-[11px] quality badge) locks D-10's 'provenance is metadata, not primary' hierarchy — figure dominates, tag whispers."

patterns-established:
  - "Zero-import pure-function modules at src/lib/* for scale/classification mapping — usable from Server Components without 'use client' contamination"
  - "Reusable metadata-tag primitive (Badge variant=outline + Tooltip wrapper with const map of verbatim copy) — externalizes Plan 21-05's inline JSX into a named component for multi-site reuse"

requirements-completed:
  - AI-RENDER-07

# Metrics
duration: 2m 51s
completed: 2026-04-22
---

# Phase 22 Plan 05: Salary Intelligence Defensive Render — ProvenanceTag Primitive Summary

**Ships the ProvenanceTag primitive — pure-function `provenanceColor`/`provenanceLabel` pair in `src/lib/provenance.ts` (zero imports, exhaustive switch over 4-source union) plus a shadcn Badge+Tooltip wrapper at `src/app/(admin)/admin/jobs/provenance-tag.tsx` with 4 verbatim UI-SPEC tooltip strings. 14 Vitest cases green across 3 describes; G-2 raw-Tailwind-color gate clean; full build exits 0.**

## Performance

- **Duration:** 2m 51s
- **Started:** 2026-04-22T20:06:02Z
- **Completed:** 2026-04-22T20:08:53Z
- **Tasks:** 4 (3 create/TDD + 1 commit)
- **Files created:** 3

## Accomplishments

- `src/lib/provenance.ts` — 57-line pure module, zero imports. Exports `ProvenanceSource` type union + `provenanceColor(source)` (4-source → 3-semantic-token switch) + `provenanceLabel(source)` (verbatim UI-SPEC labels). Safe for Server + Client Components.
- `src/__tests__/lib/provenance.test.ts` — 14 Vitest cases across 3 describe blocks: 4 color-mapping cases + 4 label-mapping cases + 4 × `it.each` no-throw + 1 non-empty + 1 lower-trust-parity. All passing.
- `src/app/(admin)/admin/jobs/provenance-tag.tsx` — 63-line `"use client"` leaf component. Exports `ProvenanceTag({source, className?})`. Renders `<Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-[10px] {provenanceColor(source)} cursor-default">…</Badge></TooltipTrigger><TooltipContent side="top" className="text-xs max-w-[220px]">{TOOLTIPS[source]}</TooltipContent></Tooltip>` — exact structural mirror of Plan 21-05's inline quality-badge JSX at `job-detail-sheet.tsx` lines 206-218.
- Internal `TOOLTIPS: Record<ProvenanceSource, string>` const map contains all 4 verbatim strings from UI-SPEC §Copywriting Contract:
  - `scraped`: `"Source: scraped from the job feed (raw value from the source posting)."`
  - `llm`: `"Source: LLM estimate generated from external market data. Not a verified figure."`
  - `company_research`: `"Source: estimated during company research against public signals."`
  - `original_posting`: `"Source: directly quoted from the job posting description."`
- Grep-gate G-2 clean on both new files (zero raw Tailwind color names — `text-green-*`, `bg-red-*`, etc.).
- AI-RENDER-07 foundation landed. Plans 22-06 (SalaryIntelligenceSection) and 22-07 (job-detail-sheet retrofits) can now import `ProvenanceTag` directly without any further primitive work.

## Task Commits

1. **Tasks 22-05-01 + 22-05-02 + 22-05-03 + 22-05-04 (bundled single commit)** — `2f8b8da` (feat) — the plan's Task 22-05-04 IS the commit step that bundles the 3 new files created by Tasks 01/02/03 atomically. This is the plan's explicit ordering: Tasks 01–03 create the files; Task 04 commits the triad.

_Note: All three file creations landed in a single `feat(22-05):` commit per the plan's explicit Task 04 directive. This is the same pattern Plan 22-04 used (edit + verify + commit bundled) and is appropriate here because the three files are tightly coupled (component imports helpers; tests import helpers) — splitting the commit would have required a temporary broken state where the component couldn't build without the helpers._

## Files Created/Modified

- **`src/lib/provenance.ts`** (NEW, 57 lines) — pure module:
  - `export type ProvenanceSource = "scraped" | "llm" | "company_research" | "original_posting"`
  - `export function provenanceColor(source: ProvenanceSource): string` — exhaustive switch, returns `text-success` / `text-warning` / `text-muted-foreground`
  - `export function provenanceLabel(source: ProvenanceSource): string` — exhaustive switch, returns verbatim UI-SPEC labels
  - Zero imports. JSDoc preamble references `score-color.ts` precedent + D-10 color≈confidence principle.
- **`src/__tests__/lib/provenance.test.ts`** (NEW, 52 lines) — 3 describes / 14 tests:
  - `describe("provenanceColor — 4-source semantic token mapping")` → 4 cases
  - `describe("provenanceLabel — 4-source verbatim label mapping")` → 4 cases
  - `describe("provenanceColor + provenanceLabel — consistency across all sources")` → 4 × `it.each` no-throw + 1 non-empty + 1 lower-trust-parity
- **`src/app/(admin)/admin/jobs/provenance-tag.tsx`** (NEW, 63 lines) — client component:
  - `"use client"` directive on line 1
  - Imports: `Badge` from `@/components/ui/badge`; `Tooltip`, `TooltipContent`, `TooltipTrigger` from `@/components/ui/tooltip`; `provenanceColor`, `provenanceLabel`, `ProvenanceSource` from `@/lib/provenance`
  - Internal `TOOLTIPS` const map (Record<ProvenanceSource, string>) with 4 verbatim UI-SPEC tooltip strings
  - `export function ProvenanceTag({ source, className }: ProvenanceTagProps)` returns `<Tooltip>`-wrapped `<Badge variant="outline">` with 3-way className composition (`text-[10px]` + provenanceColor(source) + `cursor-default` + optional caller-passed className)

## Verification Results

- **`npm test -- --run src/__tests__/lib/provenance.test.ts`** — 14/14 passing (268ms).
- **`npm test -- --run`** (full suite) — 424/424 passing across 28 test files (3.31s). Zero regressions; new tests added on top of Plan 22-04 and prior-wave baseline (395).
- **`npm run build`** — exits 0. Next.js standalone build completes; all routes compiled.
- **Grep gate G-2 (raw Tailwind color names)** — returns 0 for both `src/lib/provenance.ts` and `src/app/(admin)/admin/jobs/provenance-tag.tsx`.
- **Acceptance-criteria grep sweep** — all acceptance-criteria greps satisfied:
  - `export type ProvenanceSource` = 1 match
  - `export function provenanceColor` = 1 match
  - `export function provenanceLabel` = 1 match
  - `^import ` in provenance.ts = 0 (pure module)
  - `semantic tokens` = 7 matches (>=3 required)
  - `"use client"` on line 1 of provenance-tag.tsx = 1 match
  - `export function ProvenanceTag` = 1 match
  - `cursor-default` = 1 match, `max-w-[220px]` = 1 match
  - 4 tooltip strings each = 1 match

## Deviations from Plan

None (strict conformance).

_Minor spec-vs-content note: the plan's `<action>` block for Task 22-05-03 includes a JSDoc comment referencing "text-[11px] → text-[10px]" and "Badge variant=\"outline\"" — so the file contains these tokens in both the JSDoc comment AND the real JSX (2 grep matches instead of the 1 the `<acceptance_criteria>` block claims). This is a plan-internal phrasing nit, not a behavioral deviation — the plan's explicit content block is the source of truth for what gets written, and the relevant real-JSX occurrences exist and are correct. Documented here for executor-record transparency; the downstream grep gate G-2 (the one that actually enforces "no raw Tailwind colors") passes cleanly._

## Threat Surface Outcome

Per the plan's `<threat_model>`:
- **T-22-05-01 (Information Disclosure — unlabeled `$X` figure)** — partially mitigated. This plan delivers the primitive; actual call-site adjacency will be enforced by Plan 22-07's grep gate G-1. The primitive exists and is ready for consumers.
- **T-22-05-02 (Spoofing — typo in label text)** — mitigated. Tests assert exact verbatim UI-SPEC strings (`"LLM estimate"`, `"company research"`, `"posted"`, `"scraped"`) so any future typo-drift fails CI.

No new threat surface introduced. Pure-function module + Badge+Tooltip wrapper — no network endpoints, no DB access, no auth paths, no file access.

## Patterns Established

- **Zero-import pure-function modules at `src/lib/*` for scale/classification mapping** — the `score-color.ts` precedent is now confirmed-reusable for `provenance.ts` and future similar surfaces (e.g., phase-24 regenerate quality deltas, if they adopt this shape).
- **Metadata-tag primitive (Badge variant="outline" + Tooltip wrapper + const TOOLTIPS map of verbatim UI-SPEC copy)** — externalizes Plan 21-05's inline JSX into a named component for multi-site reuse. Plans 22-06 and 22-07 will each import `<ProvenanceTag>` instead of duplicating Badge+Tooltip JSX.
- **Exhaustive switch over string-union type (no `default` branch)** — TypeScript's exhaustiveness check is the tripwire for future 4→5 source drift, not a runtime default-fallback.

## Known Stubs

None. All 3 files are fully wired:
- `provenance.ts` → 4 switch cases populated, no TODOs
- `provenance.test.ts` → 14 assertions, no skipped tests
- `provenance-tag.tsx` → TOOLTIPS map populated with 4 verbatim strings, component renders full Badge+Tooltip tree

No hardcoded empty values, no placeholder text, no silent-hide branches.

## Downstream Consumers

- **Plan 22-06** — `SalaryIntelligenceSection.tsx` will `import { ProvenanceTag } from "@/app/(admin)/admin/jobs/provenance-tag"` and render `<ProvenanceTag source="llm" />` after every headline salary figure (P50, P25–P75 range, etc.).
- **Plan 22-07** — `job-detail-sheet.tsx` retrofits will render `<ProvenanceTag source="scraped" />` after the header salary figure AND `<ProvenanceTag source="company_research" />` after the Company Intel salary range. Plan 22-07's grep gate G-1 will enforce adjacency between every rendered `$` figure and a `<ProvenanceTag>`.

## Self-Check: PASSED

Verified post-write:

- `src/lib/provenance.ts` exists (57 lines).
- `src/__tests__/lib/provenance.test.ts` exists (52 lines).
- `src/app/(admin)/admin/jobs/provenance-tag.tsx` exists (63 lines).
- Commit `2f8b8da` present in `git log` — `feat(22-05): provenanceColor + provenanceLabel + ProvenanceTag component (AI-RENDER-07 foundation; D-09/D-10/D-11)`.
- `git diff HEAD~1 HEAD --name-only` lists exactly 3 files (matches plan's `<acceptance_criteria>` for Task 22-05-04).
- No unintended deletions in commit (`git diff --diff-filter=D --name-only HEAD~1 HEAD` = empty).
