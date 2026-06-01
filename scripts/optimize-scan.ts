/**
 * Optimize the original page scans for one recipe to a web-friendly size.
 *
 * Reads every image in public/images/recipes/<slug>/, auto-orients via EXIF,
 * downscales the long edge to at most MAX_EDGE px (never upscales), re-encodes
 * to high-quality JPEG, and rewrites them as page-1.jpg, page-2.jpg, ... in
 * numeric/alpha order. Originals are replaced in place (keep your phone's
 * full-res copies as the master backup).
 *
 * Usage:
 *   bun run optimize:scan <slug>
 *   # e.g. bun run optimize:scan grandma-hudson-apple-pie
 */

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const MAX_EDGE = 2000;
const QUALITY = 82;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".tif", ".tiff"]);

async function main() {
  const slug = process.argv[2]?.trim();
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error("[optimize:scan] Usage: bun run optimize:scan <slug>  (lowercase-hyphen slug)");
    process.exit(1);
  }

  const dir = path.join(process.cwd(), "public", "images", "recipes", slug);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    console.error(`[optimize:scan] No folder at public/images/recipes/${slug}/`);
    process.exit(1);
  }

  const sources = entries
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (sources.length === 0) {
    console.error(`[optimize:scan] No image files in public/images/recipes/${slug}/`);
    process.exit(1);
  }

  // Encode all sources first (read fully into buffers) so we can safely
  // delete originals and rewrite page-N.jpg without read/write collisions.
  const buffers: Buffer[] = [];
  for (const file of sources) {
    const buf = await sharp(path.join(dir, file))
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    buffers.push(buf);
  }

  // Remove the originals, then write normalized page-N.jpg files.
  await Promise.all(sources.map((f) => fs.unlink(path.join(dir, f))));
  for (let i = 0; i < buffers.length; i++) {
    await fs.writeFile(path.join(dir, `page-${i + 1}.jpg`), buffers[i]);
  }

  console.log(
    `[optimize:scan] ${slug}: optimized ${buffers.length} page(s) -> page-1.jpg … page-${buffers.length}.jpg (<=${MAX_EDGE}px, q${QUALITY}).`
  );
}

main().catch((e) => {
  console.error("[optimize:scan] Unexpected error:", e);
  process.exit(1);
});
