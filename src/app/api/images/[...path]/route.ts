import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { resolveImageKey, getS3Client } from "@/lib/images";

// Processed images are always served as WebP; used as the fallback when the
// R2 object lacks a ContentType.
const DEFAULT_CONTENT_TYPE = "image/webp";

/**
 * GET /api/images/[photoId]
 *
 * Serves images from Cloudflare R2 (object storage).
 * Query params:
 *   - size: "thumbnail" | "medium" | "original" (default: "medium")
 *
 * Cache headers set for Cloudflare edge caching:
 *   - public, max-age=31536000 for thumbnails/medium (immutable — key includes photoId)
 *   - public, max-age=86400 for originals
 *
 * Auth: photos that belong to an album are public; album-less photos
 *   (no albumId) require an authenticated session.
 *
 * Graceful degradation (CLOUD-03): if the R2 object is missing (NoSuchKey / 404),
 * returns a 307 redirect to /api/images/placeholder/{photoId} — which serves an
 * SVG placeholder. This covers the 1 restored NAS-era photo whose object is not in R2.
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

  // Validate size parameter against allowed values
  const rawSize = request.nextUrl.searchParams.get("size");
  const allowedSizes = ["thumbnail", "medium", "original"] as const;
  const size =
    rawSize && allowedSizes.includes(rawSize as (typeof allowedSizes)[number])
      ? (rawSize as "thumbnail" | "medium" | "original")
      : "medium";

  // Look up photo in database
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { album: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Auth check: photos with an album are public; album-less photos
  // (no albumId) require an authenticated session.
  //
  // INTENTIONAL DESIGN (single-trusted-family model): this gate is
  // authentication-only, not per-user authorization. Any logged-in family
  // member can fetch any album-less photo by id — there is no owner/ACL check.
  // This is by design for the single-trusted-family threat model and should not
  // be flagged as an authorization gap.
  const requiresAuth = !photo.albumId;

  if (requiresAuth) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Resolve R2 object key (server-generated from photoId/albumId — no client path)
  const objectKey = resolveImageKey(photoId, size, photo.originalPath ?? undefined);

  // Fetch from R2
  const s3 = getS3Client();
  let r2Response;
  try {
    r2Response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: objectKey,
      })
    );
  } catch (err: unknown) {
    // GRACEFUL DEGRADATION (CLOUD-03 / T-30-12):
    // When R2 returns NoSuchKey (the 1 unmigrated NAS photo, or any missing
    // derivative), redirect to the SVG placeholder route. Never let this surface
    // as an unhandled 5xx — the gallery renders a placeholder instead.
    const errName = (err as { name?: string })?.name;
    const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    const isNotFound =
      errName === "NoSuchKey" ||
      errName === "NotFound" ||
      httpStatus === 404;

    if (isNotFound) {
      return NextResponse.redirect(
        new URL(`/api/images/placeholder/${photoId}`, request.url),
        307
      );
    }

    // Unexpected error (auth/network) — surface as 502
    console.error("[images] R2 GetObject failed:", err);
    return NextResponse.json(
      { error: "Image storage unavailable" },
      { status: 502 }
    );
  }

  if (!r2Response.Body) {
    // Empty body — treat as missing
    return NextResponse.redirect(
      new URL(`/api/images/placeholder/${photoId}`, request.url),
      307
    );
  }

  // Stream R2 body to response
  // In Node.js runtime, Body is a SdkStreamMixin / Readable; collect to buffer.
  const chunks: Uint8Array[] = [];
  for await (const chunk of r2Response.Body as Readable) {
    chunks.push(chunk as Uint8Array);
  }
  const fileBuffer = Buffer.concat(chunks);

  // Determine content type (R2 objects are all .webp for processed images)
  const contentType = r2Response.ContentType || DEFAULT_CONTENT_TYPE;

  // Cache headers for Cloudflare edge caching
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
