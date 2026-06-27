---
phase: 38-public-surfaces
plan: 01
subsystem: public-homepage
tags: [photos, featured, homepage, query, grid]
dependency_graph:
  requires: []
  provides: [getFeaturedPhotos, featured-grid-homepage]
  affects: [src/app/(public)/page.tsx, src/lib/photo-queries.ts, src/components/public/photo-grid-preview.tsx]
tech_stack:
  added: []
  patterns: [surface-collection-query, graceful-empty-state, parallel-fetch]
key_files:
  created: []
  modified:
    - src/lib/photo-queries.ts
    - src/__tests__/lib/photo-queries.test.ts
    - src/components/public/photo-grid-preview.tsx
    - src/app/(public)/page.tsx
decisions:
  - "Use findUnique on collection slug + include.photos for featured query (mirrors CONTEXT-specified shape)"
  - "No placeholder tiles — render exactly photos.length tiles"
  - "Generic alt text 'The Hudson Family photo' (never filename/title)"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-26"
  tasks_completed: 3
  files_modified: 4
---

# Phase 38 Plan 01: Featured Homepage Grid Summary

## One-liner

Homepage Photos section driven by `getFeaturedPhotos()` — a `featured` surface-collection query returning up to 9 sortOrder-ordered photos in a 3-column grid with graceful empty state.

## What Was Built

### Task 1: getFeaturedPhotos() query + unit tests

Added `getFeaturedPhotos()` to `src/lib/photo-queries.ts`. Imports `FEATURED_SLUG` and `FEATURED_MAX` from `@/lib/featured` (no literals). Calls `prisma.collection.findUnique({ where: { slug: FEATURED_SLUG }, include: { photos: { include: { photo: true }, orderBy: { sortOrder: "asc" }, take: FEATURED_MAX } } })`. Returns `[]` when the collection row is absent (graceful-empty contract), otherwise maps `CollectionPhoto` join rows to their `.photo` records.

Four unit tests added to `src/__tests__/lib/photo-queries.test.ts` in a `describe('getFeaturedPhotos', ...)` block:
1. Calls `collection.findUnique` with `where: { slug: FEATURED_SLUG }` (asserts constant, not literal)
2. Include has `orderBy: { sortOrder: 'asc' }` and `take: FEATURED_MAX`
3. Returns `[]` when `findUnique` resolves `null`
4. Maps join rows to Photo records in order

All 9 tests pass (5 existing `getUncollectedPhotos` + 4 new `getFeaturedPhotos`).

### Task 2: PhotoGridPreview repurposed as featured grid

Rewrote `src/components/public/photo-grid-preview.tsx`:
- Removed `const displayPhotos = photos.slice(0, 6)` 6-cap
- Deleted the entire placeholder-padding block (`Array.from({ length: Math.max(0, 6 - displayPhotos.length) }).map(...)`)
- Renders exactly `photos.length` tiles — no empty filler
- Alt text set to `"The Hudson Family photo"` — no `photo.title` reference
- Dropped `title` from the `Photo` interface (no longer referenced)
- `grid grid-cols-3 gap-1.5`, `aspect-square`, `Link href="/photos"`, `unoptimized` all preserved
- No `"use client"` — remains Server-Component-friendly

### Task 3: Homepage wired to getFeaturedPhotos()

Rewrote `src/app/(public)/page.tsx`:
- Replaced `prisma.photo.findMany({ where: { published: true }, take: 6, ... })` with `getFeaturedPhotos()`
- Removed `import prisma from "@/lib/prisma"` (no longer needed)
- Added `import { getFeaturedPhotos } from "@/lib/photo-queries"`
- `Promise.all([getFeaturedPhotos(), getRecipeIndex()])` — parallel fetch preserved, no waterfall
- Local variable renamed from `photos` to `featuredPhotos`
- Empty state: `<p className="text-sm text-text-dim italic">No featured photos yet</p>` (theme token, no raw color)
- `await connection()` preserved
- `SectionHeader` with `"View all photos"` → `/photos` preserved

## Verification Results

- `npm test -- src/__tests__/lib/photo-queries.test.ts` — 9/9 passed
- `npx tsc --noEmit` — no errors
- `grep -c "getFeaturedPhotos" src/app/(public)/page.tsx` → 2 (import + call)
- `grep -c "take: 6" src/app/(public)/page.tsx` → 0
- `grep -c "published: true" src/app/(public)/page.tsx` → 0
- `grep -c "placeholder" src/components/public/photo-grid-preview.tsx` → 0
- `grep -c "slice(0, 6)" src/components/public/photo-grid-preview.tsx` → 0
- `grep -c "photo.title" src/components/public/photo-grid-preview.tsx` → 0
- `grep -c "The Hudson Family photo" src/components/public/photo-grid-preview.tsx` → 1
- `grep -c "grid-cols-3" src/components/public/photo-grid-preview.tsx` → 1

## Deviations from Plan

None — plan executed exactly as written.

## Known Build Warning (Pre-existing, Not Introduced Here)

`npm run build` fails with a kysely version conflict in `@better-auth/kysely-adapter@1.6.12` referencing `DEFAULT_MIGRATION_TABLE` from `kysely@0.29.2` (where it no longer exists). This error is present on the baseline branch before any plan-01 changes — confirmed by stashing all changes and re-running the build. It is out of scope for this plan.

## Known Stubs

None. The graceful empty state ("No featured photos yet") is intentional — the `featured` collection row is seeded in Phase 40. The component is complete and will render photos the moment that row exists.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- src/lib/photo-queries.ts — `getFeaturedPhotos` exported at line 41
- src/__tests__/lib/photo-queries.test.ts — 4 new tests + 5 existing pass
- src/components/public/photo-grid-preview.tsx — placeholder removed, generic alt set
- src/app/(public)/page.tsx — getFeaturedPhotos wired, prisma import removed, parallel fetch preserved
