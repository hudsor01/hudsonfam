# Phase 37: Data Model & Actions Foundation - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** Owner-confirmed v6.0 design (no separate discuss-phase needed)

<domain>
## Phase Boundary

Build the **data/actions layer only** for the photo overhaul — NO public UI, NO dashboard UI, NO live DB data changes (those are phases 38/39/40). No Prisma schema change is needed: the existing `Collection` (kind `album` | `surface`) + `CollectionPhoto` (`@@unique([collectionId, photoId])`) model already supports everything.

Delivers the server-side primitives the later phases consume:
1. Single-**album** membership enforcement (COLL-01).
2. An "All Photos" (uncollected) query helper.
3. The `featured` surface-collection contract + featured add/remove/reorder + max-9 guard (FEAT-04).
4. Visibility default flip so new uploads are public (VIS-01/VIS-02 code layer).

Covers requirements: **COLL-01, FEAT-04, VIS-01, VIS-02** (code/action layer; the live-data backfill + collection seeding is Phase 40).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Collections are album-exclusive (COLL-01)
- A photo's "home" is at most ONE **album-kind** collection. `surface`-kind collections (`memorial`, `featured`) are references, NOT a home — they do NOT count toward exclusivity and never trigger removal.
- `addPhotoToCollection(collectionId, photoId)` in `src/lib/collection-actions.ts`: when the **target collection is kind `album`**, atomically remove the photo's `CollectionPhoto` rows for every OTHER album-kind collection first (so it lands in exactly one album). Adding to a `surface` collection does nothing special. Do this in a single transaction.
- "All Photos" = photos with NO `CollectionPhoto` row pointing at an `album`-kind collection. Add a reusable query (e.g. `getUncollectedPhotos()` or a documented Prisma `where`) in a lib module so Phase 38 (/photos) and Phase 39 (dashboard) share it. Order newest-first (`createdAt desc`).

### Featured = a `surface` collection (FEAT-04)
- The homepage grid is driven by a single `surface` collection with slug `featured` (mirrors how `memorial` works). The collection ROW itself is seeded in Phase 40 — Phase 37 only builds the code that targets it by slug.
- Featured add/remove/reorder REUSE the existing `addPhotoToCollection` / `removePhotoFromCollection` / `reorderCollectionPhoto` actions against the `featured` collection. The existing `@@unique([collectionId, photoId])` already prevents the same photo appearing twice → FEAT-04 "no duplicates" is satisfied with no new constraint.
- A photo may be featured whether or not it's in an album (featured is a surface ref). Featured membership must NOT remove a photo from its album.
- **Max 9:** add a guard so the `featured` collection can't exceed 9 photos — reject (throw) an add when it already has 9. Keep the guard server-side (so the dashboard UI in Phase 39 just surfaces the error).

### Visibility defaults (VIS-01, VIS-02 — code layer)
- New uploads default to **public**: the upload path must set `published: true` by default (today `upload-form.tsx` sends a `publishNow` toggle — flip the default to true; the toggle UI is REMOVED in Phase 39, not here).
- Keep the `published` column and the `/api/images` auth gate intact (out of scope to remove). Making everything `published: true` is what renders all photos public.
- The one-time backfill of EXISTING rows to `published: true` is a **gated live-DB step in Phase 40**, not here.

### Constraints
- TDD-friendly where it fits (the membership-exclusivity + max-9 + uncollected query are pure-ish logic with clear I/O — unit-test against the mocked Prisma client in `src/__tests__/mocks/prisma.ts`).
- No new dependencies. Follow existing `collection-actions.ts` patterns (`"use server"`, `requireRole`, `revalidatePath`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Actions / data layer (modify or extend)
- `src/lib/collection-actions.ts` — `addPhotoToCollection`, `removePhotoFromCollection`, `reorderCollectionPhoto`, `setPhotoPublished`, `createCollection` etc. (the file to extend for exclusivity + featured + max-9).
- `prisma/schema.prisma` — `Photo`, `Collection` (`kind` album|surface), `CollectionPhoto` (`@@unique([collectionId, photoId])`, `sortOrder`, `layout`). No schema change expected.
- `src/lib/prisma.ts` — Prisma singleton (adapter-pg).

### Reuse patterns (read, don't modify)
- `src/app/(dashboard)/dashboard/memorial/media/page.tsx` — how a `surface` collection (slug `memorial`) is queried + managed (the model for `featured`).
- `src/app/(public)/page.tsx` — current homepage photo query (`published: true`, take 6) that Phase 38 replaces with the featured collection.
- `src/app/api/images/[...path]/route.ts` — the `published` auth gate (leave intact).
- `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` — the upload `published`/`publishNow` field to default-true.

### Tests
- `src/__tests__/mocks/prisma.ts` — mocked Prisma client for unit tests.
- `src/__tests__/lib/dashboard-actions.test.ts` — pattern for testing server actions against the mock.
</canonical_refs>

<specifics>
## Specific Ideas
- Implement album-exclusivity inside `addPhotoToCollection` itself (single entry point) rather than a separate action, so every caller (dashboard grid, per-collection picker in Phase 39) gets it for free.
- Featured ops don't need new action names — Phase 39's featured manager calls the same collection actions with the `featured` collection's id.
</specifics>

<deferred>
## Deferred (NOT this phase)
- Seeding the `featured` + 3 starter collections, deleting "Moving to Dallas", backfilling existing `published` → **Phase 40** (gated live-DB).
- Homepage 3×3 grid, /photos collections+All-Photos, hidden filenames → **Phase 38**.
- Featured manager UI, per-collection manage page, publish-toggle removal → **Phase 39**.
</deferred>

---

*Phase: 37-data-model-actions-foundation*
*Context gathered: 2026-06-26 via owner-confirmed v6.0 design*
