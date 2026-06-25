# Photo Collections — Design Spec

**Date:** 2026-06-25
**Status:** Approved (pending spec review)
**Author:** brainstormed with Claude

## Problem

Photos are managed by two disjoint systems, and "albums" are overloaded as the
single organizing primitive:

- **`Photo` / `Album`** drive the main site. A photo belongs to **at most one**
  album (`Photo.albumId`, set only at upload — there is no reassignment UI).
- **`MemorialMedia`** drives the memorial page as **free-form URL strings**, with
  no foreign key back to `Photo`. Deleting a photo leaves a dead memorial link.
- **Visibility is implicit:** `/api/images` treats "in an album" as public and
  album-less as private. Organization and access control are fused.

Consequences: a photo can't appear in more than one place, the memorial
duplicates references by URL (no referential integrity, no orientation fix), and
there is no way to feature a library photo on the memorial without re-uploading
or pasting URLs.

## Goals

- One **media library** (`Photo`) as the single source of truth — one upload,
  one R2 object, one id.
- A photo can appear in **multiple places at once** (memorial, homepage, an
  album) with no file/record duplication.
- **Curate the memorial** by selecting photos from the library — no URL paste.
- **Decouple** storage / organization / visibility, the standard DAM pattern
  (Cloudinary, Craft CMS, AEM).
- Per-placement control of **order, caption, and bento layout** so the same photo
  can read/size differently on the memorial vs elsewhere.

## Non-Goals (YAGNI)

- The future self-hosted genealogy / family-tree project and its many pages. The
  collection model generalizes to it for free, but we build **only the
  `memorial` surface** now.
- A general tag/keyword system. Collections cover the current need.
- Migrating memorial **videos** — they are external YouTube/Vimeo embeds, not
  library photos, and stay as `MemorialMedia(type:"video")`.

## Data Model

```prisma
model Collection {
  id           String   @id @default(cuid())
  slug         String   @unique          // "memorial", "lake-trip-2024", "homepage"
  title        String
  description  String?
  kind         String   @default("album") // "album" | "surface"
  coverPhotoId String?
  date         DateTime?
  createdAt    DateTime @default(now())
  photos       CollectionPhoto[]
}

model CollectionPhoto {                  // many-to-many join: one photo, many places
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  photoId      String
  photo        Photo      @relation(fields: [photoId], references: [id], onDelete: Cascade)
  sortOrder    Int        @default(0)
  caption      String?    // per-placement override; falls back to Photo.caption
  layout       String     @default("auto") // "auto" | "wide" | "tall" | "feature"

  @@unique([collectionId, photoId])       // can't add the same photo to a collection twice
  @@index([collectionId, sortOrder])
}

model Photo {
  id            String   @id @default(cuid())
  title         String?
  caption       String?
  published     Boolean  @default(false)  // visibility — replaces the album-null gate
  originalPath  String
  thumbnailPath String
  width         Int
  height        Int
  takenAt       DateTime?
  uploadedById  String
  createdAt     DateTime @default(now())
  collections   CollectionPhoto[]

  @@index([published])
  @@index([uploadedById])
}
```

**Removed:** `Album` model and `Photo.albumId` (migrated into `Collection` /
`CollectionPhoto`).
**Kept:** `MemorialMedia` — videos only.

### The three concerns, separated

- **Organization:** `kind:"album"` collections → rendered on `/photos`.
- **Curation / surfaces:** `kind:"surface"` collections with reserved slugs →
  `"memorial"` (the masonry), later `"homepage"`. "Select a few for the memorial"
  = add `CollectionPhoto` rows to the `memorial` collection.
- **Visibility:** explicit `Photo.published` is the single source of truth.
  `/api/images` serves a photo if `published`, else requires login. Adding a
  photo to **any** collection auto-sets `published:true` as a convenience (all
  current collections render publicly); **removing never auto-unpublishes**, and
  the **Publish toggle** is the manual override (so you can publish without
  placing, or keep a photo in a collection but unpublished). Visibility stays
  decoupled — placement only nudges the flag, it doesn't define it.

## Renderer Mapping (LayoutGrid)

`LayoutGrid` (memorial masonry) `Card` contract → data source:

| `Card` field | Source |
|---|---|
| `id` (number) | derived from render index |
| `thumbnail` | `/api/images/${photo.id}?size=medium` ← `Photo.id` |
| `alt` | `CollectionPhoto.caption ?? Photo.caption` |
| `content` (expand overlay) | `Photo.title` + caption |
| `className` (bento span) | from `CollectionPhoto.layout` |

`layout` → `className` mapping (grid is `md:grid-cols-3`, `auto-rows-[20rem]`):

- `auto` → derive span from the photo's aspect ratio (`Photo.width`/`height`):
  landscape → `md:col-span-2`, portrait → `md:row-span-2`, square → normal.
- `wide` → `md:col-span-2`
- `tall` → `md:row-span-2`
- `feature` → `md:col-span-2 md:row-span-2`

No other new fields — `LayoutGrid` is fully fed by `Photo.id` +
`CollectionPhoto.{sortOrder, caption, layout}`.

## Migration (expand → backfill → contract)

Live data is tiny (1 album, 1 photo in it, 0 memorial media), so risk is low.

1. **Expand** (additive Prisma migration): add `Collection`, `CollectionPhoto`,
   `Photo.published` (default `false`); keep `Photo.albumId` temporarily.
2. **Backfill** (one script, run on `main` against the live DB — worktrees can't
   reach `.env.local`):
   - Each `Album` → a `Collection(kind:"album")` (copy slug/title/description/
     coverPhotoId/date).
   - Each photo with `albumId` → a `CollectionPhoto(sortOrder = createdAt rank)`
     and `published:true`.
   - Album-less photos → `published:false` (preserves current private behavior).
   - Create `Collection(slug:"memorial", kind:"surface", title:"Richard Hudson Sr.")`.
   - `MemorialMedia(type:"photo")` rows whose URL resolves to `/api/images/<id>`
     → a `CollectionPhoto` in `memorial` (+ caption, `published:true`);
     unresolvable URLs logged and skipped. (Currently zero rows — effectively a
     no-op.)
3. **Cut over** all code to read collections + `published`.
4. **Contract** (second Prisma migration): drop `Photo.albumId` and `Album`.

## UI / Code Changes

- **`/api/images/[...path]`:** gate flips from `!photo.albumId` to
  `!photo.published`.
- **Photos dashboard (`/dashboard/photos`)** — library + control center: per-photo
  `⋯` menu gains **Publish toggle**, **Add to collection…** (multi-select, incl.
  *Memorial*), edit caption/title, delete.
- **Collections management** replaces the Albums pages: create/edit/delete
  collections; reorder photos (`sortOrder`); set cover; set per-photo `layout`.
- **Memorial dashboard:** photo section switches from URL-paste to **"pick from
  the library"** (manages the `memorial` collection — order/layout/caption).
  Videos stay (`MemorialMedia(type:"video")`).
- **Public `/photos` + `/photos/[slug]`:** read `kind:"album"` collections.
- **Homepage:** read `published` photos (replaces `albumId not null`).
- **Memorial page (`/richard-hudson-sr`):** `LayoutGrid` cards built from the
  `memorial` collection; videos from `MemorialMedia`.
- **Reordering UI (drag-and-drop):** each collection management view (memorial,
  album, later homepage) renders its photos in a **sortable grid** via the
  **DiceUI Sortable** shadcn-registry component (`@diceui/sortable`, built on
  `@dnd-kit/*`, keyboard-accessible). Installed the same way as the Aceternity
  LayoutGrid: `bunx --bun shadcn@latest add @diceui/sortable`. On drag end the new
  order persists via `reorderCollectionPhoto` (batch `sortOrder` update). Public
  pages render read-only in `sortOrder` — no drag UI ships to visitors.
- **Server actions** (all `requireRole`-gated): `createCollection`,
  `updateCollection`, `deleteCollection`, `addPhotoToCollection`,
  `removePhotoFromCollection`, `reorderCollectionPhoto`, `setPhotoLayout`,
  `setPhotoPublished` — replacing the album actions.

## Testing

- Update `/api/images` visibility test (album → `published`).
- Update memorial page test (gallery source = `memorial` collection).
- Update `prod-readiness` assertions that reference albums/`MemorialMedia` photos.
- New unit tests for the collection server actions (auth gating, add/remove,
  reorder, `layout`/`published` setters) and the `layout → className` derivation.

## Risks & Rollout

- **Live DB migration.** Use expand → backfill → contract so the app keeps
  working between steps; backfill runs sequentially on `main` (not a worktree).
- **Visibility regression.** The cutover must preserve "album-less = private";
  covered by the `published:false` default for album-less photos plus the
  `/api/images` test.
- **Broad blast radius** (uploader, both dashboards, `/photos`, homepage,
  memorial, `/api/images`). Sequence in the plan so each surface is cut over and
  verified before dropping `Album`.

## Resolved Decisions

- Albums are fully migrated into collections (not kept alongside).
- Visibility is an explicit `Photo.published` flag, not derived from membership.
- `layout` lives on `CollectionPhoto` (per-placement), defaulting to aspect-aware
  `auto`.
- Memorial **videos** remain `MemorialMedia`; only photos move to the library.
