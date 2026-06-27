---
phase: 39-dashboard-management
plan: "02"
subsystem: dashboard/photos/albums
tags: [photos, albums, collections, dashboard, picker]
dependency_graph:
  requires: ["39-01"]
  provides: ["COLL-02"]
  affects: ["src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx"]
tech_stack:
  added: []
  patterns: ["Server Component data fetch", "album-kind guard", "PhotoLibraryPicker reuse"]
key_files:
  modified:
    - src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx
decisions:
  - "Used relative import path (../../../memorial/media/photo-library-picker) rather than @/ alias to cross route-group boundaries without TypeScript path confusion"
  - "album-kind guard (collection.kind === 'album') prevents surface collections from showing the uncollected picker"
metrics:
  duration: "< 5 minutes"
  completed: "2026-06-26"
  tasks_completed: 1
  files_modified: 1
---

# Phase 39 Plan 02: Album Manage Page — Add from Library Summary

## One-liner

Per-album manage page wired with PhotoLibraryPicker (uncollected library source) and album-exclusive guard, alongside the existing SortablePhotoGrid.

## What Was Done

Enhanced `src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx`:

1. Imported `getUncollectedPhotos` from `@/lib/photo-queries` and `PhotoLibraryPicker` from `../../../memorial/media/photo-library-picker`.
2. After `notFound()` guard, conditionally fetches uncollected photos only for album-kind collections (`collection.kind === "album"`).
3. Maps uncollected photos to `{ id, title, caption }` shape the picker expects.
4. Renders an "Add from Library" card (`bg-card border border-border rounded-xl p-5`) with `text-accent` uppercase heading, guarded by `collection.kind === "album"`, containing `<PhotoLibraryPicker collectionId={collection.id} photos={libraryPhotos} label={collection.title} />`.

All existing elements unchanged: breadcrumbs, SectionHeader, DeleteCollectionButton (album-only), CollectionForm, Photos heading, SortablePhotoGrid.

## Deviations from Plan

**1. [Rule 3 - Blocking] Fixed relative import path depth**

- **Found during:** Task 1 TypeScript verification
- **Issue:** Plan suggested `../../memorial/media/photo-library-picker` (2 levels up from `[id]/`) but the actual path requires 3 levels up (`../../../`) — from `albums/[id]/` → `albums/` → `photos/` → `dashboard/memorial/media/`
- **Fix:** Changed to `../../../memorial/media/photo-library-picker`
- **Files modified:** `src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx`

## Verification Results

- `npx tsc --noEmit` — clean (zero errors)
- `npm run lint` — clean
- `npm test` — 231/231 passed (15 test files)
- `grep` confirms `getUncollectedPhotos`, `PhotoLibraryPicker`, and `SortablePhotoGrid` all wired in the album page

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- `src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx` — exists and modified
- All three key symbols wired: `getUncollectedPhotos` (line 11, 44), `PhotoLibraryPicker` (line 7, 103), `SortablePhotoGrid` (line 6, 95)
