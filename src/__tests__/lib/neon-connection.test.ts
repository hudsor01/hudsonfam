/**
 * Neon runtime connection verification (CLOUD-01)
 *
 * Integration test: skips cleanly when DATABASE_URL is unset (CI without secrets).
 * When DATABASE_URL is set, asserts the restored seed counts from the 2026-04-04 backup:
 *   1 user, 1 album, 1 photo, 5 events.
 *
 * Does NOT re-migrate or re-seed — CLOUD-01's migrate/seed is already complete.
 */
import { describe, it, expect, afterAll } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe("Neon runtime connection (CLOUD-01)", () => {
  let prismaClient: typeof import("@/lib/prisma")["default"] | undefined;

  afterAll(async () => {
    if (hasDb && prismaClient) {
      await prismaClient.$disconnect();
    }
  });

  it.skipIf(!hasDb)(
    "connects to Neon via PrismaPg pooled adapter and reads seed data",
    async () => {
      // Dynamic import so the module (and its pool) is only created when DB is available
      const { default: prisma } = await import("@/lib/prisma");
      // Assign for afterAll cleanup
      prismaClient = prisma;

      const [userCount, albumCount, photoCount, eventCount] = await Promise.all([
        prisma.user.count(),
        prisma.album.count(),
        prisma.photo.count(),
        prisma.event.count(),
      ]);

      expect(userCount, "at least 1 user (owner) in seed").toBeGreaterThanOrEqual(1);
      expect(albumCount, "at least 1 album in seed").toBeGreaterThanOrEqual(1);
      expect(photoCount, "at least 1 photo in seed").toBeGreaterThanOrEqual(1);
      expect(eventCount, "at least 5 events in seed (Easter, Dallas, Game, Memorial, Summer)").toBeGreaterThanOrEqual(5);
    }
  );

  it.skipIf(hasDb)(
    "skips cleanly when DATABASE_URL is not set",
    () => {
      // This test exists to document the skip-when-no-secrets behavior.
      // It never runs when DATABASE_URL is set (that case is handled above).
      expect(process.env.DATABASE_URL).toBeUndefined();
    }
  );
});
