---
phase: 38-public-surfaces
plan: "02"
subsystem: public-photos
tags: [photos, public-surfaces, privacy, queries]
dependency_graph:
  requires: ["38-01"]
  provides: ["PHOTOS-01", "PHOTOS-02", "PHOTOS-03"]
  affects: ["src/app/(public)/photos/page.tsx", "src/components/public/album-photo-grid.tsx", "src/components/public/lightbox.tsx"]
tech_stack:
  added: []
  patterns: ["getUncollectedPhotos", "generic-alt-text"]
key_files:
  modified:
    - src/app/(public)/photos/page.tsx
    - src/components/public/album-photo-grid.tsx
    - src/components/public/lightbox.tsx
    - src/__tests__/prod-readiness.test.ts
decisions:
  - "All Photos on /photos = uncollected photos (no album-kind CollectionPhoto row), sourced from getUncollectedPhotos()"
  - "Photo titles/captions never rendered on public surfaces; alt text is always the generic 'The Hudson Family photo'"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-26"
  tasks: 3
  files: 4
---

# Phase 38 Plan 02: Public Photo Surfaces — All-Photos Swap + No-Filename Summary

One-liner: Swapped /photos All-Photos to getUncollectedPhotos(), stripped all title/caption overlays from album grid and lightbox, enforced generic alt text.

## What Was Done

**Task 1 (PHOTOS-01 + PHOTOS-02):** `src/app/(public)/photos/page.tsx` — replaced the second arm of the `Promise.all` from an inline `prisma.photo.findMany({ where: { published: true }, select: {...} })` with `getUncollectedPhotos()` imported from `@/lib/photo-queries`. The album-kind collection cards section above it (PHOTOS-01) was untouched. The `allPhotos` binding and `<AlbumPhotoGrid photos={allPhotos} />` render remain identical.

**Task 2 (PHOTOS-03):** `src/components/public/album-photo-grid.tsx` — deleted the hover title overlay block (`{photo.title && <div ...><p>{photo.title}</p></div>}`) and changed `alt` from `photo.title || photo.caption || "Photo"` to `"The Hudson Family photo"`. `src/components/public/lightbox.tsx` — deleted the caption block (`{(photo.title || photo.caption) && <div ...>...</div>}`) and changed `alt` from `photo.title || photo.caption || "Photo"` to `"The Hudson Family photo"`. Both interfaces still carry `title`/`caption` props (data flows through but is not displayed). Counter `{currentIndex + 1} / {photos.length}` preserved.

**Task 3:** Added a new `describe('v6.0 Public Surfaces — Phase 38', ...)` block in `src/__tests__/prod-readiness.test.ts` with six source-read assertions covering: homepage uses `getFeaturedPhotos` + no `take: 6`/`published: true`; /photos uses `getUncollectedPhotos` + no `where: { published: true }`; /photos retains `kind: "album"` cards; album grid has no `{photo.title}` and contains generic alt; lightbox has no `{photo.title}`/`{photo.caption}` and contains generic alt; lightbox counter preserved.

## Test Results

- `npm test` — 231 tests pass across 15 test files (no regressions)
- `npx tsc --noEmit` — clean
- `grep -rn "{photo.title}|{photo.caption}" album-photo-grid.tsx lightbox.tsx` — zero matches

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — changes are purely query-selection and JSX-deletion; no new endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- src/app/(public)/photos/page.tsx: contains `getUncollectedPhotos` (3 occurrences), does not contain `where: { published: true }`, retains `kind: "album"` and `AlbumPhotoGrid`
- src/components/public/album-photo-grid.tsx: no `{photo.title}`, contains `The Hudson Family photo`
- src/components/public/lightbox.tsx: no `{photo.title}`, no `{photo.caption}`, contains `The Hudson Family photo`, counter present
- src/__tests__/prod-readiness.test.ts: 30 tests pass (6 new Phase 38 assertions all green)
- Full suite: 231/231 pass
