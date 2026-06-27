import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { processImage } from "@/lib/images";
import { randomUUID } from "crypto";

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

/**
 * resolvePublished — v6.0 default-public behavior (VIS-01 / VIS-02)
 *
 * Canonical rules for the `published` flag on a new upload:
 *   1. collectionId present → always true (collection-forced publish)
 *   2. publishedRaw missing / "on" / "true" → true (default-public)
 *   3. publishedRaw === "false" → false (explicit owner override; toggle
 *      UI removed in Phase 39, backfill of existing rows in Phase 40)
 *
 * Exported for unit testing; not a public API surface.
 */
export function resolvePublished(
  publishedRaw: string | null,
  collectionId: string | null
): boolean {
  // Rule 1: collection-forced publish
  if (collectionId) return true;
  // Rule 2 & 3: default-public — only "false" overrides
  return publishedRaw !== "false";
}

/**
 * POST /api/photos
 *
 * Upload a photo via multipart form data.
 * Auth required (any role: owner, admin, member).
 *
 * Form fields:
 *   - file: image file (required)
 *   - collectionId: collection ID to assign to (optional)
 *   - published: "true"/"false" or checkbox "on" (optional, defaults to true)
 *   - title: photo title (optional)
 *   - caption: photo caption (optional)
 *
 * Returns: photo metadata JSON
 */
export async function POST(request: NextRequest) {
  // Auth check — any authenticated user can upload
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const collectionId = formData.get("collectionId") as string | null;
  const publishedRaw = formData.get("published") as string | null;
  const title = formData.get("title") as string | null;
  const caption = formData.get("caption") as string | null;

  // Validate file
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Validate collectionId if provided
  if (collectionId) {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
  }

  // Generate photo ID
  const photoId = randomUUID();

  // Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Process image (generates thumbnail + medium, saves original to Cloudflare R2)
  // Use "unassigned" as the album path segment so R2 key is originals/unassigned/<id>.webp
  let imageMetadata;
  try {
    imageMetadata = await processImage(
      buffer,
      photoId,
      "unassigned",
      file.name
    );
  } catch (err) {
    console.error("Image processing failed:", err);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }

  // Resolve published flag (VIS-01 / VIS-02 default-public behavior)
  const finalPublished = resolvePublished(publishedRaw, collectionId);

  // Save metadata to database
  const photo = await prisma.photo.create({
    data: {
      id: photoId,
      title: title || null,
      caption: caption || null,
      published: finalPublished,
      originalPath: imageMetadata.originalPath,
      thumbnailPath: imageMetadata.thumbnailPath,
      width: imageMetadata.width,
      height: imageMetadata.height,
      takenAt: imageMetadata.takenAt,
      uploadedById: session.user.id,
    },
  });

  // If a collection was provided, link the photo to it
  if (collectionId) {
    const sortOrder = await prisma.collectionPhoto.count({
      where: { collectionId },
    });
    await prisma.collectionPhoto.create({
      data: {
        collectionId,
        photoId: photo.id,
        sortOrder,
      },
    });
  }

  return NextResponse.json(
    {
      id: photo.id,
      title: photo.title,
      caption: photo.caption,
      published: photo.published,
      width: photo.width,
      height: photo.height,
      takenAt: photo.takenAt,
      thumbnailUrl: `/api/images/${photo.id}?size=thumbnail`,
      mediumUrl: `/api/images/${photo.id}?size=medium`,
      originalUrl: `/api/images/${photo.id}?size=original`,
      createdAt: photo.createdAt,
    },
    { status: 201 }
  );
}
