import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { resolveImagePath } from "@/lib/images";

// Content type map for serving images
const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/**
 * GET /api/images/[photoId]
 *
 * Serves images from NAS/local storage.
 * Query params:
 *   - size: "thumbnail" | "medium" | "original" (default: "medium")
 *
 * Cache headers set for Cloudflare edge caching:
 *   - public, max-age=31536000 for thumbnails/medium (immutable — filename includes photoId)
 *   - public, max-age=86400 for originals
 *
 * Auth: FAMILY-visibility album photos require authenticated session.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: "Missing image path" }, { status: 400 });
  }

  const photoId = pathSegments[0];
  const size =
    (request.nextUrl.searchParams.get("size") as
      | "thumbnail"
      | "medium"
      | "original") || "medium";

  // Look up photo in database
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { album: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Auth check: photos without an album are treated as FAMILY by default.
  const isFamilyOnly = !photo.albumId;

  if (isFamilyOnly) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Resolve file path
  const filePath = resolveImagePath(
    photoId,
    size,
    photo.originalPath
  );

  // Verify file exists
  try {
    await fs.access(filePath);
  } catch {
    return NextResponse.json(
      { error: "Image file not found" },
      { status: 404 }
    );
  }

  // Read file
  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  // Cache headers for Cloudflare edge caching
  // Thumbnails and medium are immutable (filename includes photoId + size)
  // Originals get shorter cache (might be re-uploaded)
  const cacheControl =
    size === "original"
      ? "public, max-age=86400, s-maxage=604800"
      : "public, max-age=31536000, s-maxage=31536000, immutable";

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "CDN-Cache-Control": cacheControl,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
