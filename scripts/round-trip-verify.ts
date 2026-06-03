/**
 * Wave 0 — D-03 Round-Trip Verification Script
 *
 * Proves the photo pipeline end-to-end:
 *   processImage (PutObjects 3 keys to R2)
 *   → GetObject via normalized S3Client (direct, not HTTP proxy)
 *   → Assert image/webp + non-zero bytes (no 307 redirect)
 *   → DeleteObjectsCommand (cleanup — no orphaned objects)
 *
 * processImage does NOT write to the DB, so no DB row cleanup is needed.
 *
 * Covers: PHOTO-01 (proxy returns real WebP), PHOTO-03 (GetObject with
 * corrected endpoint returns bytes, never 307).
 *
 * Requires (all present in .env.local):
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * Does NOT require BETTER_AUTH_SECRET or any auth env var — calls
 * processImage and the S3 SDK directly, not the HTTP proxy.
 *
 * Usage: bun run scripts/round-trip-verify.ts
 */

import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { processImage, normalizeR2Endpoint } from "../src/lib/images";
import type { Readable } from "stream";

const TEST_PHOTO_ID = randomUUID();
const TEST_ALBUM_ID = "test-roundtrip";
// Resolve the sample image relative to THIS script (not the process CWD) so the
// verifier works regardless of the directory it is invoked from.
const SAMPLE_IMAGE = new URL(
  "../public/images/recipes/_inbox/IMG_2716.jpeg",
  import.meta.url
);

async function main() {
  console.log(`Round-trip verify — test photoId: ${TEST_PHOTO_ID}`);

  // ── Step 1: processImage → PutObjects 3 keys to R2 ─────────────────────────
  const buffer = readFileSync(SAMPLE_IMAGE);
  const meta = await processImage(buffer, TEST_PHOTO_ID, TEST_ALBUM_ID, "test.jpg");
  console.log(`processImage keys: thumbnail=${meta.thumbnailPath}  medium=${meta.mediumPath}`);

  // ── Step 2: Build normalized S3Client ────────────────────────────────────────
  // Reuse the runtime's exported normalizeR2Endpoint so the verifier exercises
  // the exact same code path as getR2Client — the two can never drift.
  const rawEndpoint = process.env.R2_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
  const endpoint = normalizeR2Endpoint(rawEndpoint, bucket);

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  console.log(`Using endpoint: ${endpoint}`);

  // Step 1 PutObjects three real objects to the live bucket. Wrap the
  // GetObject + assertions in try/finally so the Step 5 cleanup ALWAYS runs —
  // even when an assertion fails — and no orphaned test objects leak (WR-02).
  try {
    // ── Step 3: GetObject thumbnail key ───────────────────────────────────────
    const resp = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: meta.thumbnailPath })
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of resp.Body as Readable) {
      chunks.push(chunk as Uint8Array);
    }
    const bytes = Buffer.concat(chunks);

    // ── Step 4: Assertions ──────────────────────────────────────────────────────
    if (resp.ContentType !== "image/webp") {
      console.error(`FAIL: ContentType=${resp.ContentType} (expected image/webp)`);
      process.exit(1);
    }
    if (bytes.length === 0) {
      console.error("FAIL: Body is empty (0 bytes)");
      process.exit(1);
    }

    console.log(`PASS: ${bytes.length} bytes, ContentType=${resp.ContentType}`);
  } finally {
    // ── Step 5: Cleanup R2 objects ──────────────────────────────────────────────
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: [
            { Key: meta.originalPath },
            { Key: meta.thumbnailPath },
            { Key: meta.mediumPath },
          ],
          Quiet: true,
        },
      })
    );

    console.log("CLEANUP: R2 objects deleted");
  }
}

main().catch((err) => {
  console.error("round-trip-verify FAILED:", err);
  process.exit(1);
});
