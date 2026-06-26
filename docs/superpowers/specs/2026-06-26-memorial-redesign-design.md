# Memorial Page Redesign — Design Spec

**Date:** 2026-06-26
**Status:** Approved (visually, via the brainstorm visual companion)
**Scope:** `src/app/(public)/richard-hudson-sr/page.tsx` (single-page frontend rewrite)

## Problem

The memorial page is one long, monotonous centered column (monogram hero →
about → photo gallery → video tributes → share-a-memory → closing). It reads as
generic and stretches very tall. The family wants a premium, organized layout
that features Richard's portrait.

## Approved Layout

A combination chosen by the family across six mockups:

1. **Hero** — full-bleed **portrait cover** (the memorial photo) with a bottom
   scrim gradient and, overlaid bottom-left: the `In Loving Memory` eyebrow, the
   serif `Richard Hudson Sr.` name, and `May 16, 1964 – December 28, 2025`.
   - Image: `object-fit: cover; object-position: center top` (Crop A — shows his
     face), height ~`480px` (≈`60vh` cap on large screens, shorter on mobile).
2. **Body — two columns** (`1fr 340px`, stacks on mobile):
   - **Left (wide):** the obituary prose under an `About Richard Hudson Sr.`
     label (intro lead + the full obituary paragraphs incl. brothers/sisters and
     girlfriend).
   - **Right (sticky):** a bordered **"Survived by his children"** card (warm
     card bg, soft shadow, accent left-border list items) — the 6 children with
     their kids.
3. **Scripture** — a **full-width band** at the bottom (tinted accent bg,
   border-top), Revelation 21:4 centered and reading horizontally so it doesn't
   stretch the page tall.
4. **Footer** — the existing "The Hudson Family — Dallas, Texas" line.

**Removed entirely:** the **video** section, the **photo gallery** (LayoutGrid),
and the **share-a-memory** section (form + displayed memories).

## Data & Code Changes (in `page.tsx`)

- Keep `getMemorialPhotos()` (the `memorial` collection, ordered). The **hero
  uses `photos[0]`**; there is no gallery. If `photos` is empty, the hero falls
  back to the existing `R` monogram.
- **Remove** the `prisma.memorialMedia` video query, the `prisma.memory` query +
  `MemoryForm` import + the memories render, and the `LayoutGrid` import/usage.
- Hero `<Image>` uses `unoptimized` (project convention for `/api/images`).
- **`generateMetadata`:** OG/Twitter image = the hero photo (unchanged logic,
  still `photos[0]`).
- **JSON-LD (`MemorialJsonLd`):** keep `Person` + `WebPage`. Remove the
  `ImageGallery` block and the `interactionStatistic` (CommentAction/memory
  count) — there is no gallery or comments anymore. `memoryCount` prop drops.
- Styling uses existing tokens only (`background/foreground/primary/accent/card/
  border/muted-foreground/text-dim`, `font-serif/font-sans`). No new colors.

## Visibility

The hero photo must be `published` to render for logged-out visitors. Adding a
photo to the `memorial` collection auto-publishes it (existing behavior), so the
current photo already qualifies.

## Testing

- Update the memorial assertions in `src/__tests__/prod-readiness.test.ts`:
  remove the gallery/`layoutToSpan`/video/`summary_large_image`-via-gallery and
  "share a memory" expectations; assert the page renders a hero image from the
  `memorial` collection and the Revelation 21:4 scripture, and **does not**
  contain the video or memory-form sections.
- `npm run typecheck && npm run lint && npm test` green.

## Out of Scope (follow-up cleanup — noted, not done here)

Removing the public sections orphans some backend that becomes harmless dead
weight; tracked for a later cleanup, not this change:
- Dashboard `memorial/memories` moderation page + the video sub-section of
  `memorial/media`.
- `Memory` and video-only `MemorialMedia` models + a drop migration.
- `submitMemory` + the rate limiter + unused `MemorialMedia` video actions.
- The `LayoutGrid` component (now unused) — left installed.

This keeps the redesign a clean, shippable single-file change.
