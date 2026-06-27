---
phase: 39-dashboard-management
plan: "03"
subsystem: dashboard/photos
tags: [publish-toggle-removal, featured-manager-link, regression-tests]
dependency_graph:
  requires: ["39-01", "39-02"]
  provides: [no-publish-ui, featured-manager-link, phase-39-regression-tests]
  affects: [dashboard-photos-grid, upload-form, photo-actions]
tech_stack:
  added: []
  patterns: [source-level-regression-assertions]
key_files:
  modified:
    - src/app/(dashboard)/dashboard/photos/photo-actions.tsx
    - src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx
    - src/app/(dashboard)/dashboard/photos/page.tsx
    - src/__tests__/prod-readiness.test.ts
decisions:
  - "Removed published prop from PhotoActionsProps entirely — not nullable, since no callers need it"
  - "Collection status label shows first album-kind collection title or 'All Photos'; surface collections (featured) excluded from label to avoid owner confusion"
  - "albumMap built from kind=album filter so surface/memorial collections don't appear as tile labels"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-26"
  tasks_completed: 3
  files_modified: 4
---

# Phase 39 Plan 03: Publish Toggle Removal + Featured Manager Link Summary

**One-liner:** Removed publish toggle and checkbox from photo actions/upload form; dashboard Photos grid now shows collection/All-Photos status and links to the Featured manager; 5 Phase-39 regression assertions added.

## What Was Done

### Task 1 — Remove publish toggle from photo actions and upload form

`photo-actions.tsx`:
- Removed `setPhotoPublished` from the `@/lib/collection-actions` import
- Removed `published: boolean` from `PhotoActionsProps` and the component signature
- Removed `handlePublishToggle` function
- Removed the `DropdownMenuCheckboxItem checked={published}` publish control from the menu
- "View Full Size", "Add to collection" submenu, and Delete are all intact

`upload-form.tsx`:
- Removed `publishNow` state (`useState(true)`)
- Removed the `publish-now` checkbox div
- Changed `formData.append("published", publishNow ? "true" : "false")` to always `formData.append("published", "true")`

`setPhotoPublished` in `src/lib/collection-actions.ts` is untouched (plumbing retained).

### Task 2 — Replace filename label with quiet status + Featured manager link

`photos/page.tsx`:
- Built `albumMap` (collectionId → title) from album-kind collections only
- Per-tile label changed from `{photo.title || "Untitled"}` (raw filename) to the photo's first album collection title, or `"All Photos"` when uncollected
- Label uses `text-muted-foreground` instead of `text-foreground` (quiet, not primary label)
- Added "Manage Featured" `<Link href="/dashboard/photos/featured">` to the quick-links row using the same card-link styling as "Manage Collections"
- Removed `published={photo.published}` prop from `<PhotoActions>` (matches Task 1 prop removal)
- Page remains a Server Component; no raw Tailwind color names

### Task 3 — Source-level regression assertions (TDD)

Added `describe('v6.0 Phase 39 — Dashboard Management', ...)` block to `prod-readiness.test.ts` with 5 source-level assertions:
1. `photo-actions.tsx` has no `setPhotoPublished` or `handlePublishToggle`
2. `upload-form.tsx` has no `publish-now`/`publishNow`; always sends `published", "true"`
3. `photos/page.tsx` contains `/dashboard/photos/featured` and not `photo.title || "Untitled"`
4. `featured/page.tsx` references `FEATURED_SLUG`, `SortablePhotoGrid`, `PhotoLibraryPicker`
5. `albums/[id]/page.tsx` contains `getUncollectedPhotos` and `PhotoLibraryPicker`

## Test Results

- `npx tsc --noEmit` — clean (no output)
- `npm run lint` — clean
- `npm test` — **236 tests passed, 15 test files, 0 failures**
  - `prod-readiness` suite: 35 tests (30 pre-existing + 5 new Phase 39)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/app/(dashboard)/dashboard/photos/photo-actions.tsx` — modified, no publish toggle
- `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` — modified, no checkbox
- `src/app/(dashboard)/dashboard/photos/page.tsx` — modified, featured link present
- `src/__tests__/prod-readiness.test.ts` — modified, Phase 39 describe block added
- All 236 tests pass; tsc and lint clean
