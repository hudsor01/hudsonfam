import prisma from "@/lib/prisma";
import { FEATURED_SLUG, FEATURED_MAX } from "@/lib/featured";

/**
 * Collection kind constants matching prisma/schema.prisma Collection.kind values.
 * "album"   — user-created photo albums (shown in /photos)
 * "surface" — system collections (memorial, featured) that do NOT gate All-Photos
 */
export const COLLECTION_KIND = {
  ALBUM: "album",
  SURFACE: "surface",
} as const;

/**
 * getUncollectedPhotos — All-Photos query (VIS-01 / COLL-01 read side)
 *
 * Returns every Photo that has NO CollectionPhoto row pointing at an
 * album-kind collection, ordered newest-first.
 *
 * "All Photos" definition: a photo is uncollected (appears in All Photos)
 * when it has ZERO memberships in album-kind collections. Photos that are
 * only in surface collections (memorial, featured) are still returned —
 * surface memberships do NOT remove a photo from All Photos.
 *
 * Usage: imported by Phase 38 (/photos public page) and Phase 39 (dashboard
 * All Photos view). NOT a server action — callers gate their own pages.
 */
/**
 * getFeaturedPhotos — Homepage FEAT-01 featured grid query
 *
 * Returns photos belonging to the `featured` surface collection (NOT an album-kind
 * collection), ordered by CollectionPhoto.sortOrder asc, capped at FEATURED_MAX (9).
 *
 * Graceful-empty: the `featured` collection row is seeded in Phase 40. Until then
 * (and whenever the row is absent), this function returns [] — callers must render
 * a quiet empty state, not crash.
 *
 * Drives the homepage 3×3 grid (src/app/(public)/page.tsx). Do NOT use for
 * All-Photos queries — use getUncollectedPhotos() for that surface instead.
 */
export async function getFeaturedPhotos() {
  const collection = await prisma.collection.findUnique({
    where: { slug: FEATURED_SLUG },
    include: {
      photos: {
        include: { photo: true },
        orderBy: { sortOrder: "asc" },
        take: FEATURED_MAX,
      },
    },
  });

  if (!collection) return [];

  return collection.photos.map((cp) => cp.photo);
}

export async function getUncollectedPhotos() {
  return prisma.photo.findMany({
    where: {
      collections: {
        none: {
          collection: {
            kind: COLLECTION_KIND.ALBUM,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
