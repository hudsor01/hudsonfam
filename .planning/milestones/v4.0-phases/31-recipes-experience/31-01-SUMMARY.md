---
phase: 31-recipes-experience
plan: "01"
subsystem: recipes
tags: [search, navigation, cmdk, breadcrumbs, prev-next]
dependency_graph:
  requires: []
  provides: [recipe-search, chapter-navigation, anchor-helper, recipe-index]
  affects: [src/lib/recipes.ts, src/app/(public)/recipes/page.tsx, src/app/(public)/recipes/[slug]/page.tsx]
tech_stack:
  added: []
  patterns: [cmdk-dialog, tdd-pure-helper-split, server-to-client-index-prop]
key_files:
  created:
    - src/components/public/recipe-search.tsx
  modified:
    - src/lib/recipes.ts
    - src/__tests__/lib/recipes.test.ts
    - src/app/(public)/recipes/page.tsx
    - src/app/(public)/recipes/[slug]/page.tsx
decisions:
  - "Extracted anchor() as exported pure helper from recipes.ts — single source for listing section ids and breadcrumb category hashes"
  - "computeChapterNeighbors() is pure (IO-free) for unit testability; getChapterNeighbors() composes it with getPublishedRecipes() — mirroring existing filterByVisibility pattern"
  - "RecipeSearch receives server-built RecipeIndexEntry[] as prop — keeps client bundle lean, no client-side fetch"
  - "CommandItem value includes title+category so cmdk built-in filter matches both fields without custom filter prop"
  - "Prev/next layout uses flex-1 spacer div on absent side to keep balanced layout at chapter boundaries"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-02T15:42:25Z"
  tasks_completed: 3
  files_changed: 5
---

# Phase 31 Plan 01: Recipe Search + Breadcrumbs + Prev/Next Summary

## One-liner

cmdk recipe search dialog (Cmd/Ctrl+K + visible button, dual-field title+category filter) + Recipes › Category › Recipe breadcrumbs + chapter prev/next via book-order `order` field, all sharing a single exported `anchor()` helper.

## What Was Built

### Task 1 — Library helpers (TDD)

Added to `src/lib/recipes.ts`:
- `anchor(category)` — exported pure helper, single source for listing `id=` and breadcrumb `href=` hashes
- `RecipeIndexEntry` type — `{ slug, title, category }` for the search index
- `computeChapterNeighbors(recipes, slug)` — pure IO-free helper, category-scoped prev/next from a sorted RecipeMeta[]
- `getRecipeIndex()` — async, maps getPublishedRecipes to lightweight index
- `getChapterNeighbors(slug)` — async, composes getPublishedRecipes + computeChapterNeighbors

Removed local `anchor()` from `recipes/page.tsx`; replaced with imported version.

Appended to `src/__tests__/lib/recipes.test.ts`: 13 new cases covering `computeChapterNeighbors` (first/last/middle/unknown slug/no-cross-chapter-boundary) and `anchor` (lowercasing, special chars, trim hyphens). TDD RED → GREEN cycle verified.

### Task 2 — RecipeSearch client component

Created `src/components/public/recipe-search.tsx`:
- `"use client"` directive
- Visible `<button>` trigger (min-h-11 ≥44px, "Search recipes" text + ⌘K shortcut hint)
- `useEffect` keydown listener for Cmd/Ctrl+K toggle
- `CommandDialog` wrapping `CommandInput` / `CommandList` / `CommandEmpty` / `CommandGroup` / `CommandItem`
- `CommandItem value="${title} ${category}"` enables cmdk built-in dual-field filtering
- `onSelect` → `router.push(/recipes/{slug})` + `setOpen(false)`

Mounted on `recipes/page.tsx` after intro paragraph, receiving server-built `index` prop.

### Task 3 — Breadcrumbs + chapter prev/next on detail page

Updated `src/app/(public)/recipes/[slug]/page.tsx`:
- `Breadcrumb` → `BreadcrumbList` with `Recipes` / `{Category}` / `{Title}` items
- Category link uses `anchor(category)` imported from `@/lib/recipes` → matches listing section `id` exactly
- `getChapterNeighbors(slug)` fetched in parallel with `getRecipeBySlug`
- Prev/next nav in footer: `Link` elements with ← / → glyphs, min-h-11, border-card styling
- Gracefully omits missing side with `flex-1` spacer (no disabled placeholder)

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run src/__tests__/lib/recipes.test.ts` | 13/13 passed |
| `npm test` (full suite) | 245 passed, 1 skipped (0 failures) |
| `npm run build` | Exit 0, 1047 static pages generated |
| `npm run lint` | 0 errors, 1 pre-existing warning (unrelated data-table.tsx) |

## Deviations from Plan

None — plan executed exactly as written. The TDD RED/GREEN cycle was followed for Task 1 (tests written first, verified failing, then implementation added).

## Known Stubs

None. All data is wired: search index comes from `getRecipeIndex()` (published recipes), neighbors come from `getChapterNeighbors()` (same source), breadcrumbs use actual recipe frontmatter values.

## Threat Flags

No new threat surface introduced. Search index exposes only `{slug, title, category}` of published recipes — no drafts, no PII (T-31-02 accepted as-is). Breadcrumb/neighbor slug params pass through the existing `getRecipeBySlug` path-traversal guard (T-31-01).

## Self-Check: PASSED

- `src/components/public/recipe-search.tsx` — FOUND
- `src/lib/recipes.ts` — exports anchor, getRecipeIndex, getChapterNeighbors, computeChapterNeighbors — FOUND
- `src/__tests__/lib/recipes.test.ts` — computeChapterNeighbors + anchor cases — FOUND
- Commit 41c8802 (Task 1) — FOUND
- Commit 752a2cd (Task 2) — FOUND
- Commit b3a3594 (Task 3) — FOUND
