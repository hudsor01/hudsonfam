"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { FEATURED_SLUG, FEATURED_MAX } from "@/lib/featured";

const EDIT_ROLES = ["owner", "admin", "member"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function revalidateSurfaces() {
  revalidatePath("/photos");
  revalidatePath("/richard-hudson-sr");
  revalidatePath("/");
  revalidatePath("/dashboard/photos");
}

export async function addPhotoToCollection(collectionId: string, photoId: string) {
  await requireRole(EDIT_ROLES);

  const target = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { kind: true, slug: true },
  });
  if (!target) throw new Error("Collection not found");

  const sortOrder = await prisma.collectionPhoto.count({ where: { collectionId } });

  // FEAT-04: the featured surface collection cannot exceed FEATURED_MAX photos.
  // Reject before any row is created; duplicates remain blocked by the existing
  // @@unique([collectionId, photoId]) index (no new constraint needed).
  if (target.kind === "surface" && target.slug === FEATURED_SLUG && sortOrder >= FEATURED_MAX) {
    throw new Error(
      `Featured is limited to ${FEATURED_MAX} photos. Remove one before adding another.`
    );
  }

  if (target.kind === "album") {
    // COLL-01 album exclusivity: a photo's "home" is at most ONE album-kind
    // collection. Atomically remove the photo from every OTHER album-kind
    // collection, then create the new membership. Surface memberships
    // (memorial/featured) are references, never touched by exclusivity.
    await prisma.$transaction(async (tx) => {
      await tx.collectionPhoto.deleteMany({
        where: {
          photoId,
          collectionId: { not: collectionId },
          collection: { is: { kind: "album" } },
        },
      });
      await tx.collectionPhoto.create({ data: { collectionId, photoId, sortOrder } });
    });
  } else {
    // Surface target (memorial/featured): add as a reference only — no removal.
    await prisma.collectionPhoto.create({ data: { collectionId, photoId, sortOrder } });
  }

  await prisma.photo.update({ where: { id: photoId }, data: { published: true } });
  await revalidateSurfaces();
}

export async function removePhotoFromCollection(collectionId: string, photoId: string) {
  await requireRole(EDIT_ROLES);
  await prisma.collectionPhoto.delete({
    where: { collectionId_photoId: { collectionId, photoId } },
  });
  await revalidateSurfaces();
}

export async function reorderCollectionPhoto(collectionId: string, photoIds: string[]) {
  await requireRole(EDIT_ROLES);
  await prisma.$transaction(
    photoIds.map((photoId, sortOrder) =>
      prisma.collectionPhoto.update({
        where: { collectionId_photoId: { collectionId, photoId } },
        data: { sortOrder },
      })
    )
  );
  await revalidateSurfaces();
}

const LAYOUTS = ["auto", "wide", "tall", "feature"];
export async function setPhotoLayout(collectionId: string, photoId: string, layout: string) {
  await requireRole(EDIT_ROLES);
  if (!LAYOUTS.includes(layout)) throw new Error("Invalid layout");
  await prisma.collectionPhoto.update({
    where: { collectionId_photoId: { collectionId, photoId } },
    data: { layout },
  });
  await revalidateSurfaces();
}

export async function setPhotoPublished(photoId: string, published: boolean) {
  await requireRole(EDIT_ROLES);
  await prisma.photo.update({ where: { id: photoId }, data: { published } });
  await revalidateSurfaces();
}

export async function createCollection(input: { title: string; description?: string }) {
  await requireRole(EDIT_ROLES);
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  await prisma.collection.create({
    data: {
      title,
      slug: slugify(title),
      description: input.description?.trim() || null,
      kind: "album",
    },
  });
  await revalidateSurfaces();
}

export async function updateCollection(
  id: string,
  input: { title?: string; description?: string; coverPhotoId?: string | null }
) {
  await requireRole(EDIT_ROLES);
  await prisma.collection.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.coverPhotoId !== undefined ? { coverPhotoId: input.coverPhotoId } : {}),
    },
  });
  await revalidateSurfaces();
}

export async function deleteCollection(id: string) {
  await requireRole(["owner"]);
  const c = await prisma.collection.findUnique({ where: { id } });
  if (!c) throw new Error("Collection not found");
  if (c.kind === "surface") throw new Error("Reserved surface collection cannot be deleted");
  await prisma.collection.delete({ where: { id } }); // CollectionPhoto rows cascade
  await revalidateSurfaces();
}
