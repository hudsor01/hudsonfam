import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// NAS mount path for originals (NFS mounted in K8s deployment)
// Falls back to /tmp for local dev
const ORIGINALS_DIR =
  process.env.ORIGINALS_DIR || "/data/hudsonfam/originals";
// Local PVC path for processed thumbnails/medium
const THUMBNAILS_DIR =
  process.env.THUMBNAILS_DIR || "/data/thumbnails";

export interface ImageMetadata {
  originalPath: string;
  thumbnailPath: string;
  mediumPath: string;
  width: number;
  height: number;
  takenAt: Date | null;
}

export interface ProcessedSize {
  path: string;
  width: number;
  height: number;
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
 * Ensure a directory exists, creating it recursively if needed.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Process an uploaded image file:
 * 1. Save original to NAS at /data/hudsonfam/originals/{albumId}/{photoId}.{ext}
 * 2. Generate thumbnail (400px wide, WebP) at /data/thumbnails/{photoId}-thumbnail.webp
 * 3. Generate medium (1200px wide, WebP) at /data/thumbnails/{photoId}-medium.webp
 * 4. Extract EXIF data (dimensions, date taken)
 * 5. Return metadata object
 */
export async function processImage(
  buffer: Buffer,
  photoId: string,
  albumId: string,
  originalFilename: string
): Promise<ImageMetadata> {
  const ext = path.extname(originalFilename).toLowerCase() || ".jpg";

  // Get original dimensions
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Extract EXIF date
  const takenAt = await extractExifDate(buffer);

  // 1. Save original to NAS
  const originalDir = path.join(ORIGINALS_DIR, albumId);
  await ensureDir(originalDir);
  const originalPath = path.join(originalDir, `${photoId}${ext}`);
  await fs.writeFile(originalPath, buffer);

  // 2. Generate thumbnail (400px wide, WebP)
  await ensureDir(THUMBNAILS_DIR);
  const thumbnailPath = path.join(
    THUMBNAILS_DIR,
    `${photoId}-thumbnail.webp`
  );
  await sharp(buffer)
    .resize(400, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(thumbnailPath);

  // 3. Generate medium (1200px wide, WebP)
  const mediumPath = path.join(THUMBNAILS_DIR, `${photoId}-medium.webp`);
  await sharp(buffer)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(mediumPath);

  return {
    originalPath,
    thumbnailPath,
    mediumPath,
    width,
    height,
    takenAt,
  };
}

/**
 * Resolve an image path for a given photo ID and size.
 * Returns the absolute filesystem path to serve.
 */
export function resolveImagePath(
  photoId: string,
  size: "thumbnail" | "medium" | "original",
  originalPath?: string
): string {
  switch (size) {
    case "thumbnail":
      return path.join(THUMBNAILS_DIR, `${photoId}-thumbnail.webp`);
    case "medium":
      return path.join(THUMBNAILS_DIR, `${photoId}-medium.webp`);
    case "original":
      return originalPath || "";
    default:
      return path.join(THUMBNAILS_DIR, `${photoId}-medium.webp`);
  }
}

/**
 * Delete all image files for a photo (original + thumbnail + medium).
 */
export async function deleteImageFiles(
  photoId: string,
  originalPath: string
): Promise<void> {
  const paths = [
    originalPath,
    path.join(THUMBNAILS_DIR, `${photoId}-thumbnail.webp`),
    path.join(THUMBNAILS_DIR, `${photoId}-medium.webp`),
  ];

  await Promise.all(
    paths.map(async (p) => {
      try {
        await fs.unlink(p);
      } catch {
        // File may not exist — ignore
      }
    })
  );
}
