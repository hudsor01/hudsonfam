import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// R2 client — configured from env; region must be "auto" for Cloudflare R2
// ---------------------------------------------------------------------------

/**
 * Normalize an R2 endpoint by stripping a trailing `/<bucket>` path segment.
 *
 * Guards against R2_ENDPOINT being set as
 *   https://<account>.r2.cloudflarestorage.com/<bucket>
 * which causes the SDK to build `/bucket/bucket/key` URLs → NoSuchKey on every
 * request. Robust to the common copy-paste variants of that mis-configuration:
 *   - exact `/<bucket>`
 *   - `/<bucket>/` (trailing slash)
 *   - `/<bucket>?query` (query string)
 * Returns an origin-only (or path-trimmed) endpoint. Falls back to the raw
 * input if it cannot be parsed as a URL.
 */
export function normalizeR2Endpoint(rawEndpoint: string, bucket: string): string {
  try {
    const u = new URL(rawEndpoint);
    // Strip a single trailing /<bucket> path segment (with or without trailing slash)
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length && segments[segments.length - 1] === bucket) {
      segments.pop();
    }
    u.pathname = segments.length ? "/" + segments.join("/") : "/";
    u.search = "";
    // R2 virtual-host vs path-style only needs origin; drop trailing slash
    return u.pathname === "/" ? u.origin : u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return rawEndpoint;
  }
}

function getR2Client(): S3Client {
  const rawEndpoint = process.env.R2_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
  const endpoint = normalizeR2Endpoint(rawEndpoint, bucket);

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const R2_BUCKET = () => process.env.R2_BUCKET!;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export interface ImageMetadata {
  originalPath: string;
  thumbnailPath: string;
  mediumPath: string;
  width: number;
  height: number;
  takenAt: Date | null;
}

/**
 * Extract EXIF date from image buffer.
 * Returns null if no EXIF date is found.
 */
async function extractExifDate(buffer: Buffer): Promise<Date | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.exif) {
      // sharp exposes EXIF via metadata — parse DateTimeOriginal
      const exifStr = metadata.exif.toString("binary");
      // KNOWN LIMITATION: this regex scans the raw binary EXIF blob and can
      // miss/misparse some encodings. A robust fix needs a dedicated EXIF
      // parser (e.g. exifr); not adding that dependency now (out of scope).
      // EXIF DateTimeOriginal format: "YYYY:MM:DD HH:MM:SS"
      const dateMatch = exifStr.match(
        /DateTimeOriginal\x00.{8}(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/
      );
      if (dateMatch) {
        const [, year, month, day, hour, minute, second] = dateMatch;
        return new Date(
          `${year}-${month}-${day}T${hour}:${minute}:${second}`
        );
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Process an uploaded image and write original + derivatives to Cloudflare R2.
 *
 * R2 key layout:
 *   originals/{albumId}/{photoId}.webp  — capped at 2400px, WebP q85
 *   derived/{photoId}-thumbnail.webp    — 400px, WebP q80
 *   derived/{photoId}-medium.webp       — 1200px, WebP q85
 *
 * Returns ImageMetadata whose originalPath/thumbnailPath/mediumPath are R2 object
 * keys (NOT URLs or filesystem paths). The /api/images/[...path] route uses these
 * keys to fetch from R2 via GetObjectCommand.
 */
export async function processImage(
  buffer: Buffer,
  photoId: string,
  albumId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _originalFilename?: string
): Promise<ImageMetadata> {
  const takenAt = await extractExifDate(buffer);

  const s3 = getR2Client();
  const bucket = R2_BUCKET();

  // R2 object keys
  const originalKey = `originals/${albumId}/${photoId}.webp`;
  const thumbnailKey = `derived/${photoId}-thumbnail.webp`;
  const mediumKey = `derived/${photoId}-medium.webp`;

  // 1. Original: capped at 2400px, WebP q85
  const originalBuffer = await sharp(buffer)
    .resize(2400, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  // Get dimensions from the resized original
  const originalMeta = await sharp(originalBuffer).metadata();
  const width = originalMeta.width ?? 0;
  const height = originalMeta.height ?? 0;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: originalKey,
      Body: originalBuffer,
      ContentType: "image/webp",
    })
  );

  // 2. Thumbnail: 400px, WebP q80
  const thumbnailBuffer = await sharp(buffer)
    .resize(400, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: "image/webp",
    })
  );

  // 3. Medium: 1200px, WebP q85
  const mediumBuffer = await sharp(buffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: mediumKey,
      Body: mediumBuffer,
      ContentType: "image/webp",
    })
  );

  return {
    originalPath: originalKey,
    thumbnailPath: thumbnailKey,
    mediumPath: mediumKey,
    width,
    height,
    takenAt,
  };
}

/**
 * Resolve the R2 object key for a given photo ID and size.
 * Replaces the old resolveImagePath (filesystem-based) function.
 *
 * The function name changes to resolveImageKey; the signature shape is preserved
 * so existing call sites only need a rename.
 */
export function resolveImageKey(
  photoId: string,
  size: "thumbnail" | "medium" | "original",
  originalKey?: string
): string {
  switch (size) {
    case "thumbnail":
      return `derived/${photoId}-thumbnail.webp`;
    case "medium":
      return `derived/${photoId}-medium.webp`;
    case "original":
      // Fall back to medium key when no original key available (NAS-era path)
      return originalKey && !originalKey.startsWith("/data/")
        ? originalKey
        : `derived/${photoId}-medium.webp`;
    default:
      return `derived/${photoId}-medium.webp`;
  }
}

/**
 * Delete all three R2 objects for a photo (original + thumbnail + medium).
 * Missing keys (NoSuchKey) are silently ignored per S3 DeleteObjects semantics.
 */
export async function deleteImageFiles(
  photoId: string,
  originalKey: string
): Promise<void> {
  const s3 = getR2Client();
  const bucket = R2_BUCKET();

  // Derive the keys to delete
  const derivedOriginalKey =
    originalKey && !originalKey.startsWith("/data/")
      ? originalKey
      : `originals/unassigned/${photoId}.webp`;

  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: [
            { Key: derivedOriginalKey },
            { Key: `derived/${photoId}-thumbnail.webp` },
            { Key: `derived/${photoId}-medium.webp` },
          ],
          Quiet: true,
        },
      })
    );
  } catch (err: unknown) {
    // NoSuchKey on delete is not an error condition — swallow it
    const code = (err as { name?: string; Code?: string })?.name ?? (err as { Code?: string })?.Code;
    if (code !== "NoSuchKey" && code !== "NotFound") {
      throw err;
    }
  }
}

/**
 * Get the R2 S3 client for external use (e.g., the image read route).
 */
export function getS3Client(): S3Client {
  return getR2Client();
}
