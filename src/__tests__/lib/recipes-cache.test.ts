import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Production memoization behavior of readAllRecipes() (src/lib/recipes.ts).
 *
 * The parsed recipe index is cached per server instance in production. These
 * tests pin the cache lifecycle: a clean read is memoized; a degraded read
 * (per-file failure) or a readdir failure must NOT be pinned — otherwise a
 * transient I/O error would freeze an empty/partial index for the lifetime of
 * the instance.
 *
 * vi.resetModules() gives each test a fresh module-level cache.
 */

const mocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: { readdir: mocks.readdir, readFile: mocks.readFile },
}));

const PUBLISHED_MDX = `---\ntitle: T\ncategory: Test\nstatus: published\norder: 1\n---\nBody`;

async function freshRecipesModule() {
  return import("@/lib/recipes");
}

describe("readAllRecipes production memoization", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.readdir.mockReset();
    mocks.readFile.mockReset();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("memoizes a clean read — the directory is scanned once across calls", async () => {
    mocks.readdir.mockResolvedValue(["a.mdx", "b.mdx"]);
    mocks.readFile.mockResolvedValue(PUBLISHED_MDX);
    const { getPublishedRecipes } = await freshRecipesModule();

    const first = await getPublishedRecipes();
    const second = await getPublishedRecipes();

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(mocks.readdir).toHaveBeenCalledTimes(1);
  });

  it("freezes the cached recipes so shared objects cannot be silently mutated", async () => {
    mocks.readdir.mockResolvedValue(["a.mdx"]);
    mocks.readFile.mockResolvedValue(PUBLISHED_MDX);
    const { getPublishedRecipes } = await freshRecipesModule();

    const [recipe] = await getPublishedRecipes();

    expect(Object.isFrozen(recipe)).toBe(true);
    expect(Object.isFrozen(recipe.frontmatter)).toBe(true);
  });

  it("does not cache a degraded read — a per-file failure is retried next call", async () => {
    mocks.readdir.mockResolvedValue(["a.mdx", "b.mdx"]);
    mocks.readFile
      .mockRejectedValueOnce(new Error("EIO"))
      .mockResolvedValue(PUBLISHED_MDX);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getPublishedRecipes } = await freshRecipesModule();

    const degraded = await getPublishedRecipes();
    const recovered = await getPublishedRecipes();

    expect(degraded).toHaveLength(1);
    expect(recovered).toHaveLength(2);
    expect(mocks.readdir).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("index not cached")
    );
    consoleError.mockRestore();
  });

  it("does not pin an empty index when readdir itself fails", async () => {
    mocks.readdir
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValue(["a.mdx"]);
    mocks.readFile.mockResolvedValue(PUBLISHED_MDX);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getPublishedRecipes } = await freshRecipesModule();

    expect(await getPublishedRecipes()).toHaveLength(0);
    expect(await getPublishedRecipes()).toHaveLength(1);
    consoleError.mockRestore();
  });

  it("shares one in-flight read across concurrent callers", async () => {
    mocks.readdir.mockResolvedValue(["a.mdx"]);
    mocks.readFile.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return PUBLISHED_MDX;
    });
    const { getPublishedRecipes, getRecipeIndex } = await freshRecipesModule();

    const [a, b] = await Promise.all([getPublishedRecipes(), getRecipeIndex()]);

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(mocks.readdir).toHaveBeenCalledTimes(1);
  });
});
