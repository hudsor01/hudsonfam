---
phase: 33-homepage-restructure
plan: 01
subsystem: public-homepage
tags: [homepage, recipes, hero, featured-recipes, photos, events, sidebar-retirement]
dependency_graph:
  requires: [32-03-PLAN.md]
  provides: [HOME-01, HOME-02, HOME-03]
  affects: [src/app/(public)/page.tsx, src/components/public/hero.tsx]
tech_stack:
  added: []
  patterns: [Promise.all parallel fetch, Server-Component-to-Client-leaf prop pass, in-memory index resolution]
key_files:
  created:
    - src/lib/featured-recipes.ts
    - src/__tests__/lib/recipes.test.ts (FEATURED_RECIPE_SLUGS describe block appended)
  modified:
    - src/components/public/hero.tsx
    - src/app/(public)/page.tsx
  deleted:
    - src/components/public/sidebar.tsx
    - src/components/public/weather-widget.tsx
decisions:
  - "FEATURED_RECIPE_SLUGS extracted to src/lib/featured-recipes.ts for family discoverability (D-02)"
  - "Featured recipes resolved via in-memory getRecipeIndex() lookup — zero extra I/O (Critical Finding 2)"
  - "SectionHeader text-xs accepted as-is for Phase 33 (known deviation, deferred to Phase 35)"
  - "Hero receives index prop; RecipeSearch is rendered as client leaf inside Server Component Hero"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-02T22:54:09Z"
  tasks_completed: 3
  files_changed: 6
---

# Phase 33 Plan 01: Homepage Restructure Summary

**One-liner:** Recipes-first homepage with Hero (Browse Recipes CTA + RecipeSearch), 6-slug featured card row resolved via in-memory index, live Photos + Events sections with empty states, retiring the orphaned Sidebar + WeatherWidget.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave-0 featured-slug regression + FEATURED_RECIPE_SLUGS constant | 7e1764e | src/lib/featured-recipes.ts, src/__tests__/lib/recipes.test.ts |
| 2 | Rework Hero — recipes-forward copy, index prop, CTA row | 06cb829 | src/components/public/hero.tsx |
| 3 | Rewrite page.tsx (4 stacked sections) + delete Sidebar & WeatherWidget | 5bc7c2d | src/app/(public)/page.tsx, sidebar.tsx (deleted), weather-widget.tsx (deleted) |

## What Was Built

**src/lib/featured-recipes.ts** — Static constant module exporting `FEATURED_RECIPE_SLUGS: string[]` with 6 curated published slugs: `adas-famous-gingerbread`, `almond-cookies`, `coleslaw`, `shepherds-pie`, `jelly-roll`, `baking-powder-biscuits`. Family-editable; top-of-file comment explains the contract.

**Wave-0 regression test** — New `describe("FEATURED_RECIPE_SLUGS")` block in `recipes.test.ts` asserting every curated slug resolves in `getRecipeIndex()` with non-empty `title` and `category`, and that the list length is 1–6 inclusive.

**src/components/public/hero.tsx** — Server Component reworked to accept `index: RecipeIndexEntry[]`. Eyebrow corrected `text-xs` → `text-sm`. Blog-era subcopy replaced with `Grandma Hudson's recipes, family photos, and moments that matter — all in one place.` CTA row added: `Browse Recipes` link + `RecipeSearch index={index}` client leaf. No `"use client"`.

**src/app/(public)/page.tsx** — Full rewrite: `Promise.all` parallel fetch of events, photos, and `getRecipeIndex()`. Featured recipes resolved via `FEATURED_RECIPE_SLUGS.map(slug => index.find(...)).filter(Boolean)` — zero extra I/O. Four stacked sections: Hero → Recipes (featured card grid) → Photos (PhotoGridPreview or empty state) → Events (date-badge list or empty state). Uses `event.startDate` (Date) directly — no `.toISOString()` shim. No `sidebarEvents`/`sidebarPhotos` shims. Events hard-filtered to `visibility: "PUBLIC"`.

**Deleted:** `sidebar.tsx` and `weather-widget.tsx` — both confirmed homepage-only usage (grep: no remaining importers).

## Deviations from Plan

### Known Deviation (accepted, not auto-fixed)

**SectionHeader label size: `text-xs` vs `text-sm`**
- `SectionHeader`'s hardcoded `text-xs` in the label `h3` remains unchanged (shared component used by dashboard + public).
- UI-SPEC calls for `text-sm` but modifying the shared component is out of Phase 33 scope.
- Accepted per plan note: "KNOWN DEVIATION (do not fix this phase)."
- Deferred to Phase 35 (navbar/footer UI pass).

None — plan executed exactly as written (aside from the above accepted known deviation).

## Verification Results

- `npx vitest run src/__tests__/lib/recipes.test.ts` — 15/15 tests pass (13 existing + 2 new FEATURED_RECIPE_SLUGS tests)
- `npm test -- --run` — 196/196 tests pass
- `npm run build` — exits 0, 1041+ pages built, no TypeScript or import errors
- `grep -rnE "public/sidebar|public/weather-widget" src/` — 0 matches (no remaining importers)
- `grep -n "RECIPES|PHOTOS|EVENTS" src/app/(public)/page.tsx` — lines 55, 78, 92 (strictly ascending)
- `grep -q "life updates" src/components/public/hero.tsx` — non-zero (string gone)
- `grep -q '"use client"' src/components/public/hero.tsx` — non-zero (Hero stays Server Component)
- `grep -q "toISOString" src/app/(public)/page.tsx` — non-zero (Date used directly)
- No raw Tailwind color names introduced in any modified file

## Known Stubs

None — all data is live (Prisma queries for events and photos; getRecipeIndex() for recipe index). Featured recipe cards render real MDX data. Empty states are intentional UI states, not stubs.

## Threat Flags

No new threat surface introduced. All STRIDE mitigations in plan threat register were verified:
- T-33-01: `visibility: "PUBLIC"` filter preserved on event query (line 20 of new page.tsx)
- T-33-02: Photos flow through existing `/api/images` proxy via PhotoGridPreview (unchanged)
- T-33-03: Only `{slug, title, category}` strings cross Server→Client boundary to RecipeSearch
- T-33-04: `connection()` opts homepage into dynamic rendering; `Promise.all` avoids waterfall

## Self-Check: PASSED

- [x] `src/lib/featured-recipes.ts` exists and exports FEATURED_RECIPE_SLUGS with all 6 slugs
- [x] `src/__tests__/lib/recipes.test.ts` contains `FEATURED_RECIPE_SLUGS` describe block
- [x] `src/components/public/hero.tsx` contains RecipeSearch, Browse Recipes CTA, text-sm eyebrow, no "life updates"
- [x] `src/app/(public)/page.tsx` contains Hero, FEATURED_RECIPE_SLUGS, Promise.all, getRecipeIndex, No photos yet, No upcoming events
- [x] `src/components/public/sidebar.tsx` does not exist (ENOENT confirmed)
- [x] `src/components/public/weather-widget.tsx` does not exist (ENOENT confirmed)
- [x] Commits 7e1764e, 06cb829, 5bc7c2d all exist in git log
- [x] `npm run build` exits 0
- [x] `npm test -- --run` exits 0 (196 tests)
