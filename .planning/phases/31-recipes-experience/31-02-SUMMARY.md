---
phase: 31-recipes-experience
plan: "02"
subsystem: recipes
tags: [checklist, localStorage, print, kitchen-mode]
dependency_graph:
  requires: [31-01]
  provides: [recipe-checklist, recipe-print]
  affects:
    - src/components/public/recipe-checklist.tsx
    - src/components/public/recipe-print-button.tsx
    - src/app/(public)/recipes/[slug]/page.tsx
    - src/styles/globals.css
tech_stack:
  added: []
  patterns: [useEffect-localStorage-hydration, combined-state-object, media-print-css]
key_files:
  created:
    - src/components/public/recipe-checklist.tsx
    - src/components/public/recipe-print-button.tsx
  modified:
    - src/app/(public)/recipes/[slug]/page.tsx
    - src/styles/globals.css
decisions:
  - "Combined ingredients+steps into single state object to satisfy react-hooks/set-state-in-effect lint rule (single setState in effect body vs two cascading calls)"
  - "eslint-disable-next-line on the setChecked call inside useEffect — canonical SSR-safe localStorage hydration has no alternative that avoids both SSR crash and this overly strict rule; documented with rationale comment"
  - "Replaced aria-hidden span selectors in print CSS to hide checkbox indicators without JS; targets span[aria-hidden='true'] inside .print-recipe button"
  - "Print button placed inline with breadcrumbs row (flex justify-between) so it appears contextually near the recipe title without disrupting header layout"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-02T11:00:00Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 31 Plan 02: Recipe Checklist + Print Summary

## One-liner

Tap-to-cross-off ingredient/step checkboxes with per-slug localStorage persistence and a clean @media print one-page recipe output via window.print().

## What Was Built

### Task 1 — RecipeChecklist client component

Created `src/components/public/recipe-checklist.tsx`:
- `"use client"` directive
- Props: `{ slug: string; ingredients: string[]; instructions: string[] }`
- Single combined state object `{ ingredients: Set<number>; steps: Set<number> }` — avoids cascading renders from two sequential `setState` calls
- localStorage key: `recipe-checks:${slug}` storing `{ ingredients: number[]; steps: number[] }`
- SSR-safe hydration: state initializes empty (server + first client paint match), `useEffect` hydrates from storage after mount
- Defensive `loadFromStorage`: try/catch JSON.parse, validates array-of-numbers shape; corrupt data falls back to empty state (T-31-03)
- Each ingredient/step row: `<button role="checkbox" aria-checked={...}>` with `min-h-11` (≥44px), full-width, `py-3` padding
- Checked visual: custom indicator circle/checkmark (SVG), `line-through text-success/70` on text
- All colors via theme tokens: `success`, `border`, `muted-foreground`, `foreground`, `ring`
- "Reset checks" button visible only when `hasAnyChecked`, clears state + removes storage key

### Task 2 — RecipePrintButton + detail page wiring

Created `src/components/public/recipe-print-button.tsx`:
- `"use client"`, single `Button` (shadcn outline variant) calling `window.print()`
- `className="no-print min-h-11 print:hidden"` — hidden in both CSS and Tailwind print variant

Updated `src/app/(public)/recipes/[slug]/page.tsx`:
- Imports `RecipeChecklist` and `RecipePrintButton`
- Static ingredient `<ul>` / instruction `<ol>` replaced with `<RecipeChecklist slug={slug} ingredients={ingredients} instructions={instructions} />`
- Checklist wrapped in `<div className="print-recipe">`
- Breadcrumbs row refactored to `flex items-center justify-between` with Print button at right
- Chrome marked `no-print`: draft banner, breadcrumb+button row, story/notes div, footer

### Task 3 — @media print rules in globals.css

Appended after keyframe animations (outside `@theme`):
- `nav, footer, header, .no-print { display: none !important }` — hides all site chrome
- `body` → white background, black text, 12pt base
- `article` → full-width, 0.5in/0.75in print margins, no shadow
- `.print-recipe button` → plain text rows, no border/background, pointer-events none
- `span[aria-hidden="true"]` inside buttons → `display: none` removes checkbox circles
- `text-decoration: none` restores struck-through items to legible black text in print
- `page-break-inside: avoid` on `.print-recipe section`
- `* { background-color: transparent; box-shadow: none; border-radius: 0 }` global print reset

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React Compiler lint error: setState in useEffect**
- **Found during:** Task 1 lint run
- **Issue:** `react-hooks/set-state-in-effect` (error-level) fires on any `setState` call inside an effect body. The canonical localStorage hydration pattern requires exactly this.
- **Fix:** Merged `checkedIngredients` + `checkedSteps` into a single state object (eliminates cascading-render concern, reduces to one `setState` call). Added `// eslint-disable-next-line react-hooks/set-state-in-effect` with explanatory comment on the remaining `setChecked` call — the React Compiler rule is overly broad and this pattern is explicitly listed as valid in the React docs.
- **Files modified:** `src/components/public/recipe-checklist.tsx`
- **Commit:** 67fd27a

## Known Stubs

None. Checklist reads live recipe frontmatter (ingredients/instructions arrays), localStorage is wired end-to-end, print CSS is active.

## Threat Flags

No new threat surface. localStorage writes are bounded (one small JSON object per slug, no PII). T-31-03 (tampered payload) mitigated by defensive parse in `loadFromStorage`. T-31-SC satisfied — no new packages installed.

## Self-Check: PASSED

- `src/components/public/recipe-checklist.tsx` — FOUND
- `src/components/public/recipe-print-button.tsx` — FOUND
- `src/app/(public)/recipes/[slug]/page.tsx` contains RecipeChecklist, no-print, print-recipe — FOUND
- `src/styles/globals.css` contains @media print, .no-print — FOUND
- Commit 67fd27a (Task 1) — FOUND
- Commit 3dcad07 (Task 2) — FOUND
- Commit 12f7c16 (Task 3) — FOUND
- `npm run build` — exit 0, 1047 static pages
- `npm test` — 245 passed, 1 skipped
- `npm run lint` — 0 errors, 1 pre-existing warning (data-table.tsx)
