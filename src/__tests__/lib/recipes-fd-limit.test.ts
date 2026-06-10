import { describe, it, expect, vi } from "vitest";

/**
 * Regression test for production EMFILE (error digest 897990896).
 *
 * content/recipes holds ~1000 .mdx files. readAllRecipes() used to open every
 * file simultaneously (Promise.allSettled over fs.readFile), exhausting the
 * serverless function's file-descriptor limit (1024 on Vercel) and starving
 * Prisma's DB socket opens — every dynamic render of `/` failed with
 * PrismaClientKnownRequestError code EMFILE.
 *
 * File reads must be concurrency-bounded well below the fd limit.
 */

const FILE_COUNT = 1000;
const MAX_ALLOWED_CONCURRENT_READS = 64;

const tracker = { current: 0, max: 0 };

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn(async () => Array.from({ length: FILE_COUNT }, (_, i) => `recipe-${i}.mdx`)),
    readFile: vi.fn(async (filePath: string) => {
      tracker.current++;
      tracker.max = Math.max(tracker.max, tracker.current);
      // Yield so sibling reads overlap — exposes unbounded fan-out.
      await new Promise((resolve) => setTimeout(resolve, 1));
      tracker.current--;
      const name = String(filePath).split("/").pop()?.replace(/\.mdx$/, "");
      return `---\ntitle: ${name}\ncategory: Test\nstatus: published\norder: 1\n---\nBody`;
    }),
  },
}));

import { getPublishedRecipes } from "@/lib/recipes";

describe("readAllRecipes fd safety", () => {
  it("reads all recipes without exceeding the concurrency bound", async () => {
    const recipes = await getPublishedRecipes();

    expect(recipes).toHaveLength(FILE_COUNT);
    expect(tracker.max).toBeGreaterThan(0);
    expect(tracker.max).toBeLessThanOrEqual(MAX_ALLOWED_CONCURRENT_READS);
  });
});
