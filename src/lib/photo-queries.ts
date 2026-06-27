import prisma from "@/lib/prisma";

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
