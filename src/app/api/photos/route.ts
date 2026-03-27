import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { processImage } from "@/lib/images";
import { createId } from "@paralleldrive/cuid2";

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
 * POST /api/photos
 *
 * Upload a photo via multipart form data.
 * Auth required (any role: owner, admin, member).
 *
 * Form fields:
 *   - file: image file (required)
 *   - albumId: album ID to assign to (optional)
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
  const albumId = formData.get("albumId") as string | null;
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

  // Validate albumId if provided
  if (albumId) {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });
    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }
  }

  // Generate photo ID
  const photoId = createId();

  // Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Process image (generates thumbnail + medium, saves original to NAS)
  const targetAlbumId = albumId || "unassigned";
  let imageMetadata;
  try {
    imageMetadata = await processImage(
      buffer,
      photoId,
      targetAlbumId,
      file.name
    );
  } catch (err) {
    console.error("Image processing failed:", err);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }

  // Save metadata to database
  const photo = await prisma.photo.create({
    data: {
      id: photoId,
      title: title || null,
      caption: caption || null,
      albumId: albumId || null,
      originalPath: imageMetadata.originalPath,
      thumbnailPath: imageMetadata.thumbnailPath,
      width: imageMetadata.width,
      height: imageMetadata.height,
      takenAt: imageMetadata.takenAt,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(
    {
      id: photo.id,
      title: photo.title,
      caption: photo.caption,
      albumId: photo.albumId,
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
