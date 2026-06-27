---
phase: 39-dashboard-management
plan: "01"
subsystem: dashboard/photos/featured
tags: [featured, photo-management, dashboard, server-component]
dependency_graph:
  requires:
    - src/lib/featured.ts (FEATURED_SLUG, FEATURED_MAX — Phase 37)
    - src/lib/collection-actions.ts (addPhotoToCollection, reorderCollectionPhoto, removePhotoFromCollection)
    - src/components/dashboard/sortable-photo-grid.tsx
    - src/components/public/photo-grid-preview.tsx
  provides:
    - src/app/(dashboard)/dashboard/photos/featured/page.tsx (featured manager — FEAT-02, FEAT-03)
    - src/app/(dashboard)/dashboard/memorial/media/photo-library-picker.tsx (generalized, collection-agnostic)
  affects:
    - src/app/(dashboard)/dashboard/memorial/media/page.tsx (caller unchanged — no prop changes needed)
tech_stack:
  added: []
  patterns:
    - Server Component page with requireRole(["owner"]) guard
    - Graceful null-collection branch (collection not seeded until Phase 40)
    - PhotoGridPreview reused for live 3×3 dashboard preview mirroring the public homepage
    - PhotoLibraryPicker generalized with optional label + disabled props (defaults preserve memorial behavior)
key_files:
  created:
    - src/app/(dashboard)/dashboard/photos/featured/page.tsx
  modified:
    - src/app/(dashboard)/dashboard/memorial/media/photo-library-picker.tsx
decisions:
  - "Picker NOT moved — kept at memorial/media/photo-library-picker.tsx; featured page imports it from that absolute path. No import updates required on the memorial caller."
  - "disabled prop added to picker; when true, button renders disabled + shows 'Cap reached' label and handleAdd returns early."
  - "isFull derived as photoItems.length >= FEATURED_MAX; passed directly to picker disabled prop."
  - "PhotoGridPreview wrapped in max-w-md container on dashboard so the 3-col preview does not span the full page width."
metrics:
  duration: "~10 minutes"
  completed: "2026-06-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 39 Plan 01: Featured Manager + Generalized Picker Summary

**One-liner:** Featured dashboard manager with live 3×3 homepage preview, drag-reorder, and capped add-from-library via a generalized PhotoLibraryPicker (label + disabled props).

## Tasks Completed

| # | Task | Status | Files |
|---|------|--------|-------|
| 1 | Generalize PhotoLibraryPicker | Done | `memorial/media/photo-library-picker.tsx` |
| 2 | Create featured manager page | Done | `photos/featured/page.tsx` |

## What Changed

### Task 1 — Generalized PhotoLibraryPicker

Added two optional props to `PhotoLibraryPickerProps`:

- `label?: string` — defaults to `"memorial collection"`. Used in the success toast (`Photo added to ${label}`) and the empty-state copy (`All library photos are already in the ${label}.`). Memorial caller passes no props → behavior identical to before.
- `disabled?: boolean` — defaults to `false`. When `true`: button rendered with `disabled` attribute, `pointer-events-none`, shows "Cap reached" label, and `handleAdd` returns early before calling `addPhotoToCollection`.

The existing memorial/media/page.tsx caller requires zero prop changes — defaults preserve the prior behavior exactly.

### Task 2 — Featured Manager Page

New Server Component at `/dashboard/photos/featured`:

- `requireRole(["owner"])` gate
- Resolves collection via `prisma.collection.findUnique({ where: { slug: FEATURED_SLUG } })`
- **Null branch:** renders a bordered card with muted copy ("Featured collection is not set up yet") — no crash, no deref on null collection id
- **Exists branch:**
  - `SectionHeader` with `{n} / {FEATURED_MAX}` count in subtitle
  - Live Preview block: `PhotoGridPreview` (grid-cols-3, mirrors homepage) in a `max-w-md` container
  - `SortablePhotoGrid` for drag-reorder and per-tile remove
  - `PhotoLibraryPicker` with `label="featured collection"` and `disabled={photoItems.length >= FEATURED_MAX}`
  - Library = all photos filtered by `!featuredPhotoIds.has(p.id)` (surface collection — photo may be featured AND in an album)

## Picker Move Decision

The picker was NOT moved. It stays at `src/app/(dashboard)/dashboard/memorial/media/photo-library-picker.tsx`. The featured page imports it via the absolute alias path. This avoids touching the memorial caller's import and keeps both files working with a single change.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — clean (0 errors)
- `npm run lint` — clean
- `npm test --run` — 230 passed, 1 pre-existing failure (neon-connection live-DB timeout, unrelated to this plan)
- `grep FEATURED_SLUG` in featured page — confirmed at lines 4 and 18
- Null-collection branch confirmed (collection not seeded; page renders graceful state, not a crash)

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/app/(dashboard)/dashboard/photos/featured/page.tsx` — exists, no `"use client"`, imports FEATURED_SLUG, SortablePhotoGrid, PhotoLibraryPicker, PhotoGridPreview
- `src/app/(dashboard)/dashboard/memorial/media/photo-library-picker.tsx` — modified, still starts with `"use client"`, still imports addPhotoToCollection
- Memorial caller (`memorial/media/page.tsx`) — unchanged, no prop additions needed, still type-checks clean
