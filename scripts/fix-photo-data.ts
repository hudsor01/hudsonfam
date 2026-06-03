/**
 * Phase 34 Plan 02 — D-01 Data Fix
 *
 * Two targeted mutations against the live Neon DB:
 *
 *   1. DELETE d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec
 *      NAS-era orphan; 0 R2 objects exist; can only ever render a broken image
 *      or placeholder publicly. Deletion is reversible via FUTURE-01 re-seed.
 *
 *   2. UPDATE f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def
 *      Set albumId = cmn8hinqw0005p1ttk12g9wa8 (Moving to Dallas album).
 *      This photo has 3 confirmed R2 objects — do NOT delete it, do NOT change
 *      originalPath. Only albumId changes so the public auth gate passes.
 *
 * Idempotent: re-running this script twice must exit 0 on the second run.
 *
 * Usage: bun run scripts/fix-photo-data.ts
 */

import prisma from "../src/lib/prisma";

const ORPHAN_ID = "d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec";
const REAL_PHOTO_ID = "f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def";
const MOVING_TO_DALLAS_ALBUM_ID = "cmn8hinqw0005p1ttk12g9wa8";

async function main() {
  // ── Fix 1: Delete NAS-era orphan d9c2e950 (D-01) ────────────────────────────
  // deleteMany returns { count: 0 } instead of throwing when the row is already
  // gone — this is what makes the operation idempotent.
  // No R2 cleanup is needed: this photo has 0 R2 objects.
  const deleteResult = await prisma.photo.deleteMany({
    where: { id: ORPHAN_ID },
  });

  if (deleteResult.count === 1) {
    console.log(
      `DELETED: ${ORPHAN_ID} (NAS-era orphan, 0 R2 objects, reversible via FUTURE-01)`
    );
  } else {
    console.log(`SKIP (already absent): ${ORPHAN_ID}`);
  }

  // ── Fix 2: Assign f77dbd54 to Moving to Dallas album (D-01 fix-not-delete) ──
  // Verify the photo exists before updating, so we can distinguish
  // "already correct" from "row missing" (the latter would be a bug).
  const existing = await prisma.photo.findUnique({
    where: { id: REAL_PHOTO_ID },
    select: { albumId: true, originalPath: true, thumbnailPath: true },
  });

  if (existing === null) {
    console.error(
      `ERROR: ${REAL_PHOTO_ID} is missing from DB — expected a photo with 3 R2 objects`
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  if (existing.albumId === MOVING_TO_DALLAS_ALBUM_ID) {
    console.log(
      `SKIP (already correct): ${REAL_PHOTO_ID} albumId=${existing.albumId}`
    );
  } else {
    // Change ONLY albumId. Do NOT touch originalPath or thumbnailPath.
    // The R2 key originals/unassigned/f77dbd54-....webp must remain as-is
    // (Pitfall 2: the object was stored under "unassigned" and is not moved).
    await prisma.photo.update({
      where: { id: REAL_PHOTO_ID },
      data: { albumId: MOVING_TO_DALLAS_ALBUM_ID },
    });

    // Re-fetch to confirm originalPath was not mutated.
    const after = await prisma.photo.findUnique({
      where: { id: REAL_PHOTO_ID },
      select: { albumId: true, originalPath: true, thumbnailPath: true },
    });

    // Assert (do not just label) that originalPath is identical to its
    // pre-update value. A silent regression that touched originalPath must
    // fail the script, not print a hardcoded "unchanged" message.
    if (after?.originalPath !== existing.originalPath) {
      console.error(
        `ERROR: originalPath mutated! before=${existing.originalPath} after=${after?.originalPath}`
      );
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(
      `UPDATED: ${REAL_PHOTO_ID} albumId=${after?.albumId} ` +
        `(originalPath unchanged: ${after?.originalPath})`
    );
  }

  await prisma.$disconnect();
  console.log("\nfix-photo-data: DONE");
}

main().catch((err) => {
  console.error("fix-photo-data ERROR:", err);
  process.exit(1);
});
