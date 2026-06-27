# Phase 39: Dashboard Management - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** Owner-confirmed v6.0 design
**Depends on:** Phase 37 (`addPhotoToCollection` album-exclusivity + max-9 featured guard, `getUncollectedPhotos`, `FEATURED_SLUG`/`FEATURED_MAX`) and Phase 38 (public surfaces).

<domain>
## Phase Boundary

Owner-facing dashboard management. Build the screens where the owner curates the homepage featured grid and organizes collections, and remove the now-obsolete publish step. NO public-page changes (Phase 38), NO live-DB seeding (Phase 40).

Covers: **FEAT-02, FEAT-03, COLL-02** + the publish-toggle UI removal (ROADMAP phase-39 success criterion 4; VIS-02's UI half).

The single biggest reuse: the existing **memorial media page** (`src/app/(dashboard)/dashboard/memorial/media/page.tsx`) already does "manage a surface collection's photos" with `SortablePhotoGrid` (drag-reorder) + `PhotoLibraryPicker` (add from library). The featured manager and the per-collection manager are the SAME pattern pointed at different collections.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Featured manager (FEAT-02, FEAT-03)
- New dashboard page at **`/dashboard/photos/featured`** ("Home / Featured"): a live preview that mirrors the homepage 3×3 grid, plus drag-to-reorder + add-from-library. Reuse `SortablePhotoGrid` (reorder) + `PhotoLibraryPicker` (add) exactly like `memorial/media/page.tsx`, with `collectionId = the featured collection's id`.
- Resolve the featured collection by `slug = FEATURED_SLUG` (`prisma.collection.findUnique`). The row is seeded in **Phase 40** — until then the page must render a graceful state ("Featured collection not set up yet" — mirror how memorial/media handles a missing collection) rather than crash.
- The library shown by the picker = **all photos not already in featured** (featured is a surface ref, so a photo can be featured AND in an album/All-Photos). Adding to featured must NOT move the photo out of its album/All-Photos home.
- **Max 9** is already enforced server-side (Phase 37 guard throws). The picker/grid should surface that limit (e.g. disable add / show "9 / 9" when full) and toast the thrown error gracefully.
- A "live preview mirroring the homepage grid" = render the featured photos in the same `grid-cols-3` shape the public homepage uses, so the owner sees exactly what visitors see.
- Link the featured manager from the dashboard Photos page (and ideally the overview quick-actions).

### Per-collection manage page (COLL-02)
- Enhance `src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx`: add `SortablePhotoGrid` (reorder the collection's photos) + `PhotoLibraryPicker` (add photos from the library), same pattern as memorial/media.
- The library for an album picker = **`getUncollectedPhotos()`** (All Photos / no-collection photos). Adding a photo to this album calls `addPhotoToCollection`, which (Phase 37) atomically removes it from All Photos / any other album — so it lands in exactly one collection. (Moving a photo between albums = remove it here, which returns it to All Photos, then add it to the other album. Acceptable; a direct album→album move is out of scope.)

### Remove the publish step (ROADMAP 39-crit-4 / VIS-02 UI)
- All photos are public now (Phase 37 default). Remove the publish toggle UI:
  - `src/app/(dashboard)/dashboard/photos/photo-actions.tsx` — remove the publish `Switch` + the `setPhotoPublished` call/handler. Keep the other actions (add-to-collection, delete).
  - `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` — remove the "Publish now" checkbox; always send `published: true` (the server default already yields true; the form no longer offers the choice).
  - Leave the `setPhotoPublished` server action and the `published` column in place (out of scope to delete) — just stop surfacing the toggle.
- Dashboard Photos grid (`dashboard/photos/page.tsx`): it already shows every uploaded photo. Replace the per-tile filename label with a quieter status (e.g. its collection name or "All Photos" / a "Featured" marker) so the owner can see at a glance where each photo lives — but do NOT render the raw upload filename as the primary label (owner doesn't care about names). Keep it lightweight.
</decisions>

<canonical_refs>
## Canonical References (read before implementing)

### Reuse pattern (the template)
- `src/app/(dashboard)/dashboard/memorial/media/page.tsx` — surface-collection manager (SortablePhotoGrid + PhotoLibraryPicker + library = "all photos minus this collection").
- `src/app/(dashboard)/dashboard/memorial/media/photo-library-picker.tsx` — the picker component (or the shared one) + its add action.
- `src/components/dashboard/sortable-photo-grid.tsx` — drag-reorder grid (calls `reorderCollectionPhoto`).

### Modify / create
- CREATE `src/app/(dashboard)/dashboard/photos/featured/page.tsx` (+ any small client picker if the memorial one isn't reusable as-is).
- MODIFY `src/app/(dashboard)/dashboard/photos/albums/[id]/page.tsx` (add manage UI).
- MODIFY `src/app/(dashboard)/dashboard/photos/photo-actions.tsx` (remove publish toggle).
- MODIFY `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` (remove Publish-now checkbox; always published:true).
- MODIFY `src/app/(dashboard)/dashboard/photos/page.tsx` (status label instead of filename; link to Featured manager).

### Actions / queries (Phase 37 — reuse, do not re-implement)
- `src/lib/collection-actions.ts` — `addPhotoToCollection` (album-exclusive + max-9), `removePhotoFromCollection`, `reorderCollectionPhoto`, `setPhotoPublished` (leave; just unused by UI).
- `src/lib/photo-queries.ts` — `getUncollectedPhotos`, `getFeaturedPhotos`.
- `src/lib/featured.ts` — `FEATURED_SLUG`, `FEATURED_MAX`.

### Tests
- `src/__tests__/prod-readiness.test.ts` and `src/__tests__/lib/dashboard-actions.test.ts` — patterns; add source-level assertions (publish toggle gone, featured page exists/uses FEATURED_SLUG, albums page adds manage UI).
</canonical_refs>

<specifics>
## Specific Ideas
- If `memorial/media/photo-library-picker.tsx` is collection-agnostic enough, promote/reuse it for both the featured and per-collection pickers rather than duplicating.
- The featured manager and memorial manager are nearly identical — keep them DRY where clean, but don't over-abstract.
</specifics>

<deferred>
## Deferred (NOT this phase)
- Seeding the `featured` + 3 starter collections, deleting "Moving to Dallas", backfilling existing `published` rows → Phase 40 (gated live-DB). The featured manager will show its empty/not-set-up state until then — expected.
- Removing the `published` column or the `setPhotoPublished` action → out of scope (kept as plumbing).
</deferred>

---

*Phase: 39-dashboard-management*
*Context gathered: 2026-06-26 via owner-confirmed v6.0 design*
