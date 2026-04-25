---
phase: 22-salary-intelligence-defensive-render
plan: 06
subsystem: admin/jobs
tags:
  - component
  - streamdown
  - empty-state
  - headline-row
  - provenance
  - render-layer
requirements:
  - AI-RENDER-03
requires:
  - 22-01 (SalaryIntelligenceSchema)
  - 22-02 (SalaryIntelligence TS type + freshness wiring)
  - 22-05 (ProvenanceTag component)
provides:
  - SalaryIntelligenceSection client component (ready to mount)
  - SalaryIntelligenceView interface
  - parseSalaryHeadline pure helper (shape detector)
  - formatSingleSalary pure helper
  - EMPTY_STATE_COPY.salary_intelligence key (2 strings)
affects:
  - Plan 22-07 (will mount SalaryIntelligenceSection at job-detail-sheet call site)
tech-stack:
  added: []
  patterns:
    - 3-branch always-render-shell (null / empty / populated) — Plan 21-06 posture
    - Streamdown skipHtml + linkSafety.enabled:false — Plan 20-05 XSS posture
    - Pure render-time shape-detector (parseSalaryHeadline) for unknown JSONB
    - Const-map empty-state copy + test-side drift guard
key-files:
  created:
    - src/app/(admin)/admin/jobs/salary-intelligence-section.tsx
    - src/lib/parse-salary-report.ts
    - src/lib/format-salary.ts
    - src/__tests__/components/salary-intelligence-section.test.tsx
  modified:
    - src/lib/empty-state-copy.ts
decisions:
  - SalaryIntelligenceSection is a single-prop read-only client component (no useState, no handlers) — matches UI-SPEC §1
  - Empty predicate is `!hasProse && !headline` (both render-layer conditions false)
  - Headline row renders inside populated branch only, never as a standalone shell — keeps "populated" branch coherent
  - ProvenanceTag imported from ./provenance-tag (Plan 22-05 sibling), not elevated to shared ui/ yet
  - parseSalaryHeadline is case-insensitive on keys (accepts `Min`, `min`, `MIN`) and deduplicates lookupKey via lowercase map
  - MIN_MEDIAN_MAX preferred over PERCENTILES when both exist — first-match wins to keep the predicate deterministic
  - formatSingleSalary returns "" (empty string) on NaN / null currency — D-12 hide-without-crash posture
  - Streamdown container copies TailoredResumeSection's classes byte-for-byte (max-h-96 overflow-y-auto border-border bg-card/50) — visual parity across sections
metrics:
  duration_minutes: 5
  completed_date: 2026-04-22
  tasks_completed: 5
  tests_added: 14
  tests_passing_before: 427
  tests_passing_after: 441
  files_touched: 5
---

# Phase 22 Plan 06: Salary Intelligence Defensive Render Summary

One-liner: **AI-RENDER-03 component layer shipped** — `SalaryIntelligenceSection` renders 3 branches (null / empty / populated) with Streamdown `skipHtml` + `linkSafety.enabled:false` XSS posture, optional headline row wrapping every figure with `<ProvenanceTag source="llm" />`, and a tolerant `parseSalaryHeadline` shape detector that accepts MIN_MEDIAN_MAX + PERCENTILES JSON while degrading to `null` for any unrecognized input without throwing.

## Outcome

Component is **ready to mount at the job-detail-sheet call site** (Plan 22-07's job). Production renders the `null` branch on every job today (0 live `salary_intelligence` rows pending n8n task #11 upstream bug) — the populated branch is fully test-covered so it comes online regression-safe on day one once upstream data lands.

## What Shipped

### 1. `src/lib/empty-state-copy.ts` — const map extended (+5 lines)

Adds `salary_intelligence: { missing: "No salary intelligence yet.", empty: "Salary intelligence was generated but is empty." }` — 4th entry in the map established by Plan 21-06. `as const` modifier preserved; both strings pass anti-CTA grep gate G-5 (no imperative verbs, no `!`, exactly one period each). Tone parity with the 3 sibling entries.

### 2. `src/lib/format-salary.ts` — new pure helper (27 lines)

`formatSingleSalary(n: number, currency: string | null | undefined): string` — zero-dependency thousands-rounded formatter. USD/GBP/EUR map to `$` / `£` / `€` prefixes; all other ISO codes fall back to `ISO 120K` (e.g. `JPY 120K`). NaN `n` or falsy currency → empty string (D-12 hide-without-crash). Case-insensitive on the ISO code. Safe from Server Components.

### 3. `src/lib/parse-salary-report.ts` — new pure helper (90 lines)

`parseSalaryHeadline(reportJson: unknown): HeadlineShape | null` — runtime duck-typing predicate that tolerates ANY JSONB shape n8n might emit. Accepts two recognized shapes:

- `MIN_MEDIAN_MAX`: `{ min, median?, max, currency }` → labels "Min" / "Median" / "Max"
- `PERCENTILES`: `{ p25, p50?, p75, currency }` (also accepts `25th`/`50th`/`75th` keys) → labels "25th" / "50th" / "75th"

Rejects (returns `null`): null, undefined, arrays, strings, numbers, empty objects, objects without currency, objects with no finite-number figures. First-match precedence (MIN_MEDIAN_MAX before PERCENTILES). Currency lookup accepts `currency` or `salary_currency`. Case-insensitive key lookup. Pure — no state, no throws, safe from Server Components.

### 4. `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — new client component (120 lines)

`SalaryIntelligenceSection({ salary })` exports both the function and the `SalaryIntelligenceView` interface. Single prop (`salary: SalaryIntelligenceView | null`) — read-only; no `useState`, no `useEffect`, no clipboard, no download (Phase 22 scope — action handlers land in Plan 23 if at all).

**Render tree (UI-SPEC §1):**

- **null branch** → heading + DollarSign icon + `<p class="italic">{missing}</p>`
- **empty branch** (salary present but `!hasProse && !headline`) → heading + `<p class="italic">{empty}</p>`
- **populated branch** → heading + right-aligned `FreshnessBadge` (modelUsed={null}); conditional headline row `{headline && …}` mapping each figure to `<span>{label}</span><span class="tabular-nums">{formatSingleSalary}</span><ProvenanceTag source="llm"/>` with `·` separators; conditional Streamdown prose `{hasProse && …}` in `bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto` container.

**XSS posture (non-negotiable, AI-SAFETY-01):** `<Streamdown skipHtml linkSafety={{ enabled: false }}>` — raw HTML stripped; link-safety modal disabled for admin-only surface. Defense in depth from Plan 20-07 CSP headers.

### 5. `src/__tests__/components/salary-intelligence-section.test.tsx` — new test file (14 cases)

Three `describe` blocks × 14 total tests:

**Branch rendering (3):** null, unrecognized-JSON-plus-blank-prose, missing-currency-with-prose.

**Populated branches (7):** MIN_MEDIAN_MAX 3-figure render, PERCENTILES 3-figure render, 3× ProvenanceTag `text-warning` + `text-[10px]` class check, headline-only (no Streamdown), prose-only (no headline row), Streamdown container class set (`bg-card/50` + `border-border` + `max-h-96` + `overflow-y-auto`), heading-always-present loop over 6 input variants.

**Anti-CTA drift guard (3 + `it.each` expansion = 4 runs):** verbatim-string assertion for both missing and empty copy against `EMPTY_STATE_COPY.salary_intelligence.*`, parameterized anti-CTA regex (click/regenerate/run/generate now/try/retry/please/start/begin/trigger → must not match) + `!` + exactly-one-period invariants across both strings.

## Grep Gates (G-2, G-3, G-5, G-7) — all hold

- **G-2 (no raw Tailwind colors):** `grep -E "(text\|bg\|border)-(red\|amber\|yellow\|green\|emerald\|orange\|blue\|gray\|zinc\|slate)-[0-9]"` in the new `.tsx` file → **0 matches**.
- **G-3 (no inline empty-state literals):** component reads `EMPTY_STATE_COPY.salary_intelligence.missing` and `.empty` — no inline string drift. Test file's verbatim-string assertions would fail immediately if someone ever edits the const map without updating the component.
- **G-5 (anti-CTA):** neither new copy string contains imperative verbs or `!`. Exactly one period each. Enforced at test-runtime by the parameterized `it.each` anti-CTA case.
- **G-7 (tabular-nums on figures):** `grep "tabular-nums"` → exactly 1 match, on the dollar-figure `<span>` inside the headline row.

## Verification

- `npm test -- --run src/__tests__/components/salary-intelligence-section.test.tsx` → 14/14 green (527ms).
- `npm test -- --run` full suite → 441/441 green (427 baseline + 14 new). Zero regressions.
- `npm run build` → exits 0 (only pre-existing Redis ENOTFOUND / Better Auth env-not-set / Next.js 16 NFT warnings, none introduced).

## Deviations from Plan

None — plan executed exactly as written. Zero Rule 1/2/3 auto-fixes, zero Rule 4 architectural escalation. Each task's action block + acceptance criteria landed on the first compile + test run.

## Threat Model — Mitigations Verified

| Threat ID     | Component                      | Mitigation Shipped |
|---------------|--------------------------------|--------------------|
| T-22-06-01    | XSS via `<script>` in llm_analysis | `skipHtml` on Streamdown (grep gate — 1 match); regression test via `tailored-resume-xss.test.tsx` already exists and shares the exact same prop pattern |
| T-22-06-02    | Crash via malformed `report_json` | `parseSalaryHeadline` type-guards every access — null / array / string / number / empty-object / object-without-currency all safely return `null` with zero throws |
| T-22-06-03    | Crash when `llm_analysis` is null | `hasProse` derived via `!!salary.llm_analysis?.trim()` — Streamdown mounted only when prose is non-empty string |
| T-22-06-05    | DoS via very long prose        | `max-h-96 overflow-y-auto` container inherited byte-identical from Plan 20-05 pattern |

T-22-06-04 disposition remains `accept` (admin-only surface; `report_json` is owner's own data from owner's own n8n pipeline).

## What Plan 22-07 Needs From This

- **Import path:** `import { SalaryIntelligenceSection, type SalaryIntelligenceView } from "./salary-intelligence-section"`.
- **Mount site:** insert inside the existing `SectionErrorBoundary` wrapper in `job-detail-sheet.tsx`, adjacent to the 3 existing sections (Cover Letter / Tailored Resume / Company Intel).
- **Wiring shape:** `<SalaryIntelligenceSection salary={detail.salary_intelligence} />` — the component already accepts `null` for the missing-row branch and picks up the freshness-wrapped field from `FreshJobDetail` (attached at Plan 22-02's `attachFreshness<SalaryIntelligence>` call).

## Commits

- `f260487` — feat(22-06): SalaryIntelligenceSection component + EMPTY_STATE_COPY.salary_intelligence + parseSalaryHeadline + formatSingleSalary (AI-RENDER-03; D-05/D-06/D-07/D-08)

## Self-Check: PASSED

- ✓ `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` exists
- ✓ `src/lib/parse-salary-report.ts` exists
- ✓ `src/lib/format-salary.ts` exists
- ✓ `src/__tests__/components/salary-intelligence-section.test.tsx` exists
- ✓ `src/lib/empty-state-copy.ts` contains `salary_intelligence:` entry
- ✓ Commit `f260487` present in `git log --oneline`
- ✓ 441/441 tests green, 14 new
- ✓ `npm run build` exits 0
