# Phase 38: Public Surfaces - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** Owner-confirmed v6.0 design
**Depends on:** Phase 37 (uses `getUncollectedPhotos()` from `src/lib/photo-queries.ts` and `FEATURED_SLUG` from `src/lib/featured.ts`).

<domain>
## Phase Boundary

Public-facing rendering only (no dashboard/management — that's Phase 39; no live-DB seeding — that's Phase 40). Wire the homepage + /photos to the new model and remove rendered filenames.

Covers: **FEAT-01, PHOTOS-01, PHOTOS-02, PHOTOS-03**.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Homepage = the featured 3×3 grid (FEAT-01)
- Add a query `getFeaturedPhotos()` (in `src/lib/photo-queries.ts`) that returns the photos of the `featured` **surface** collection (slug from `FEATURED_SLUG`), ordered by `CollectionPhoto.sortOrder asc`, **limited to 9**. It must be graceful when the `featured` collection row does not exist yet (Phase 40 seeds it) → return `[]`.
- Replace the homepage's current "Photos" section (today: `PhotoGridPreview` with 6 most-recent published photos) with a **3×3 grid of up to 9 featured photos**. Render exactly as many tiles as there are featured photos — **no empty placeholder tiles** (the current `PhotoGridPreview` pads to 6 with placeholder divs; that padding is removed). `grid-cols-3`, square tiles, click → `/photos` (keep the "View all photos" affordance).
- If `getFeaturedPhotos()` is empty, render nothing for the grid (or a single quiet "No featured photos yet" line) — do NOT show empty tiles. The homepage must still build/look right with zero featured photos.
- Either repurpose `PhotoGridPreview` (drop the 6-cap + placeholder padding, accept up to 9) or add a small `FeaturedGrid` — planner's call; reuse over new where clean.

### /photos: collections on top, All Photos below (PHOTOS-01, PHOTOS-02)
- Collections cards at the top — already implemented in `src/app/(public)/photos/page.tsx` (album-kind collections). Keep.
- The "All Photos" section must use **`getUncollectedPhotos()`** (Phase 37) instead of the current "all published photos" query — All Photos = photos in NO collection. Swap the query; keep the `AlbumPhotoGrid` + lightbox rendering.

### No filenames anywhere public (PHOTOS-03)
- `src/components/public/album-photo-grid.tsx` — remove the hover **title overlay** (the `{photo.title && (<div>…{photo.title}…)}` block).
- `src/components/public/lightbox.tsx` — remove the rendered **title + caption** overlay (the `{(photo.title || photo.caption) && (…)}` block, lines ~194–202).
- Homepage featured grid and /photos: render no title/caption text.
- `alt` attributes: use a generic, non-filename value (e.g. `"The Hudson Family photo"`), not `photo.title` (titles are upload filenames). Keep images accessible but never surface the filename.
</decisions>

<canonical_refs>
## Canonical References (read before implementing)

### Modify
- `src/app/(public)/page.tsx` — homepage; swap the Photos section for the featured 3×3.
- `src/components/public/photo-grid-preview.tsx` — the 6-cap + placeholder grid to repurpose (or replace).
- `src/app/(public)/photos/page.tsx` — /photos; swap All-Photos query to `getUncollectedPhotos()`.
- `src/components/public/album-photo-grid.tsx` — remove hover title overlay; generic `alt`.
- `src/components/public/lightbox.tsx` — remove title/caption overlay; generic `alt`.

### Reuse (Phase 37 outputs)
- `src/lib/photo-queries.ts` — `getUncollectedPhotos()` exists; ADD `getFeaturedPhotos()` here.
- `src/lib/featured.ts` — `FEATURED_SLUG`, `FEATURED_MAX`.
- `prisma/schema.prisma` — `Collection.kind`, `CollectionPhoto.sortOrder`.

### Tests
- `src/__tests__/lib/photo-queries.test.ts` — extend for `getFeaturedPhotos()`.
- `src/__tests__/prod-readiness.test.ts` — has source-level assertions about page content; update any that assume the old homepage/photos behavior.
</canonical_refs>

<specifics>
## Specific Ideas
- `getFeaturedPhotos()` shape: `prisma.collection.findUnique({ where: { slug: FEATURED_SLUG }, include: { photos: { include: { photo: true }, orderBy: { sortOrder: "asc" }, take: 9 } } })` → map to the photos; null collection → `[]`.
- Keep all public pages `await connection()` (Cache Components) as they are.
</specifics>

<deferred>
## Deferred (NOT this phase)
- Dashboard featured manager, per-collection manage page, publish-toggle removal → Phase 39.
- Seeding the `featured` + starter collections, deleting "Moving to Dallas", backfilling `published` → Phase 40 (gated live-DB). Until then the homepage featured grid is empty by design — that's expected, not a bug.
</deferred>

---

*Phase: 38-public-surfaces*
*Context gathered: 2026-06-26 via owner-confirmed v6.0 design*
