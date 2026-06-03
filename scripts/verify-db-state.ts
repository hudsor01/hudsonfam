/**
 * Wave 0 — PHOTO-02 Gate: DB State Verification
 *
 * Asserts the two-photo data state required by Phase 34 Plan 02:
 *   1. d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec (NAS-era orphan) must be DELETED
 *   2. f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def (R2-era photo) must have
 *      albumId = "cmn8hinqw0005p1ttk12g9wa8" (Moving to Dallas)
 *
 * Expected to FAIL until Plan 02 (the data fix) lands — that is intentional
 * and documented. This script exists as the runnable gate for Plan 03.
 *
 * Requires: DATABASE_URL (present in .env.local)
 * Does NOT require BETTER_AUTH_SECRET or any auth env var.
 *
 * Usage: bun run scripts/verify-db-state.ts
 */

import prisma from "../src/lib/prisma";

const ORPHAN_ID = "d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec";
const REAL_PHOTO_ID = "f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def";
const MOVING_TO_DALLAS_ALBUM_ID = "cmn8hinqw0005p1ttk12g9wa8";

async function main() {
  let allPassed = true;

  try {
    // ── Assertion 1: NAS-era orphan must be deleted ─────────────────────────────
    const orphan = await prisma.photo.findUnique({ where: { id: ORPHAN_ID } });
    if (orphan === null) {
      console.log(`PASS: ${ORPHAN_ID} (NAS-era orphan) is deleted`);
    } else {
      console.error(`FAIL: ${ORPHAN_ID} (NAS-era orphan) still exists in DB`);
      allPassed = false;
    }

    // ── Assertion 2: R2-era photo must be assigned to Moving to Dallas album ────
    const realPhoto = await prisma.photo.findUnique({ where: { id: REAL_PHOTO_ID } });
    if (realPhoto === null) {
      console.error(`FAIL: ${REAL_PHOTO_ID} (R2-era photo) is missing from DB`);
      allPassed = false;
    } else if (realPhoto.albumId === MOVING_TO_DALLAS_ALBUM_ID) {
      console.log(`PASS: ${REAL_PHOTO_ID} has albumId=${realPhoto.albumId} (Moving to Dallas)`);
    } else {
      console.error(
        `FAIL: ${REAL_PHOTO_ID} albumId=${realPhoto.albumId ?? "null"} — expected ${MOVING_TO_DALLAS_ALBUM_ID}`
      );
      allPassed = false;
    }
  } finally {
    // Disconnect on every path — success, FAIL, or thrown error.
    await prisma.$disconnect();
  }

  if (!allPassed) {
    console.error("\nverify-db-state: FAIL — run Plan 02 data fix first");
    process.exit(1);
  }

  console.log("\nverify-db-state: ALL PASS");
}

main().catch((err) => {
  console.error("verify-db-state ERROR:", err);
  process.exit(1);
});
