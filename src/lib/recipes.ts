import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

export type RecipeStatus = "draft" | "published";

export interface RecipeFrontmatter {
  title: string;
  category: string;
  scans: string[];
  contributor: string;
  sourceNote?: string | null;
  servings?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  dateAdded: string;
  status: RecipeStatus;
  reviewNotes: string[];
  order: number;
}

export interface RecipeMeta {
  slug: string;
  frontmatter: RecipeFrontmatter;
}

export interface Recipe extends RecipeMeta {
  content: string;
}

/** Coerce an unknown YAML value into a clean string[] (handles array or comma string). */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeFrontmatter(
  data: Record<string, unknown>,
  slug: string
): RecipeFrontmatter {
  return {
    title: (data.title as string) || slug,
    category: (data.category as string) || "Uncategorized",
    scans: toStringArray(data.scans),
    contributor: (data.contributor as string) || "",
    sourceNote: (data.sourceNote as string) || null,
    servings: (data.servings as string) || null,
    prepTime: (data.prepTime as string) || null,
    cookTime: (data.cookTime as string) || null,
    ingredients: toStringArray(data.ingredients),
    instructions: toStringArray(data.instructions),
    tags: toStringArray(data.tags),
    dateAdded: (data.dateAdded as string) || new Date().toISOString().split("T")[0],
    status: data.status === "published" ? "published" : "draft",
    reviewNotes: toStringArray(data.reviewNotes),
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 999999,
  };
}

/** Whether drafts are visible in the current environment (true in development). */
export function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Pure visibility filter — kept separate from IO for unit testing. */
export function filterByVisibility(
  recipes: RecipeMeta[],
  opts: { includeDrafts: boolean }
): RecipeMeta[] {
  if (opts.includeDrafts) return recipes;
  return recipes.filter((r) => r.frontmatter.status === "published");
}

async function readAllRecipes(): Promise<RecipeMeta[]> {
  let files: string[];
  try {
    files = await fs.readdir(RECIPES_DIR);
  } catch {
    return [];
  }

  // Ignore template/partials prefixed with "_" and non-mdx files.
  const mdxFiles = files.filter(
    (f) => f.endsWith(".mdx") && !f.startsWith("_")
  );

  const results = await Promise.allSettled(
    mdxFiles.map(async (filename) => {
      const filePath = path.join(RECIPES_DIR, filename);
      const raw = await fs.readFile(filePath, "utf-8");
      const { data } = matter(raw);
      const slug = filename.replace(/\.mdx$/, "");

      return {
        slug,
        frontmatter: normalizeFrontmatter(data, slug),
      };
    })
  );

  // Filter out failed reads (malformed frontmatter, IO errors, etc.)
  const recipes = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<RecipeMeta>).value);

  // Sort by book order (the `order` field); fall back to title.
  recipes.sort((a, b) => {
    const d = a.frontmatter.order - b.frontmatter.order;
    return d !== 0 ? d : a.frontmatter.title.localeCompare(b.frontmatter.title);
  });

  return recipes;
}

/** Public listing source: published always; drafts also included in development. */
export async function getAllRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return filterByVisibility(all, { includeDrafts: includeDrafts() });
}

/** Published recipes only, regardless of environment (listing grid + sitemap). */
export async function getPublishedRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return all.filter((r) => r.frontmatter.status === "published");
}

/** Draft recipes only (dev-only "needs review" section). */
export async function getDraftRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return all.filter((r) => r.frontmatter.status === "draft");
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  // Prevent path traversal: reject slugs with separators, dot sequences, or underscore prefix.
  if (
    !slug ||
    slug.startsWith("_") ||
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("..")
  ) {
    return null;
  }

  const filePath = path.join(RECIPES_DIR, `${slug}.mdx`);

  // Double-check resolved path stays within RECIPES_DIR
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(RECIPES_DIR) + path.sep)) {
    return null;
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    const frontmatter = normalizeFrontmatter(data, slug);

    // Drafts are visible only in development; 404 them in production.
    if (frontmatter.status === "draft" && !includeDrafts()) {
      return null;
    }

    return { slug, frontmatter, content };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Search index + chapter navigation helpers
// ---------------------------------------------------------------------------

/** Lightweight shape used by the search index and RecipeSearch component. */
export type RecipeIndexEntry = {
  slug: string;
  title: string;
  category: string;
};

/**
 * Slug-safe anchor fragment — converts a category string to a URL hash that
 * matches the `id` attributes rendered on listing section headings.
 * Single source of truth: both the listing and breadcrumb category links import
 * this so they can never drift.
 */
export function anchor(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Pure helper: given a pre-sorted RecipeMeta[] find the prev/next slugs within
 * the same category as `slug`. IO-free so it's directly unit-testable.
 */
export function computeChapterNeighbors(
  recipes: RecipeMeta[],
  slug: string
): { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null } {
  const target = recipes.find((r) => r.slug === slug);
  if (!target) return { prev: null, next: null };

  const chapter = recipes.filter(
    (r) => r.frontmatter.category === target.frontmatter.category
  );
  const idx = chapter.findIndex((r) => r.slug === slug);

  const prev = idx > 0
    ? { slug: chapter[idx - 1].slug, title: chapter[idx - 1].frontmatter.title }
    : null;
  const next = idx < chapter.length - 1
    ? { slug: chapter[idx + 1].slug, title: chapter[idx + 1].frontmatter.title }
    : null;

  return { prev, next };
}

/** Returns a lightweight `{slug, title, category}` array for all published recipes in book order. */
export async function getRecipeIndex(): Promise<RecipeIndexEntry[]> {
  const recipes = await getPublishedRecipes();
  return recipes.map((r) => ({
    slug: r.slug,
    title: r.frontmatter.title,
    category: r.frontmatter.category,
  }));
}

/**
 * Returns chapter prev/next for a given slug (server-side, with IO).
 * Delegates neighbor math to the pure `computeChapterNeighbors` helper.
 */
export async function getChapterNeighbors(slug: string): Promise<{
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}> {
  const recipes = await getPublishedRecipes();
  return computeChapterNeighbors(recipes, slug);
}

/** Categories in book order (first appearance), since recipes are order-sorted. */
export async function getAllCategories(): Promise<string[]> {
  const recipes = await getPublishedRecipes();
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const recipe of recipes) {
    const c = recipe.frontmatter.category;
    if (c && !seen.has(c)) {
      seen.add(c);
      ordered.push(c);
    }
  }
  return ordered;
}
