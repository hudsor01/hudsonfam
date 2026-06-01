import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { cacheLife, cacheTag } from "next/cache";

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
    contributor: (data.contributor as string) || "Grandma Hudson",
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
  };
}

/** Whether drafts are visible in the current environment (true under `bun dev`). */
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
  "use cache";
  // Recipe content is filesystem MDX committed to the repo — cache the IO and
  // tag it; all listing wrappers (getAllRecipes/getPublishedRecipes/…) reuse
  // this cached result. Drafts vs published is a pure filter applied after.
  cacheLife("hours");
  cacheTag("recipes");

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

  // Sort by title ascending for a predictable, browsable order.
  recipes.sort((a, b) =>
    a.frontmatter.title.localeCompare(b.frontmatter.title)
  );

  return recipes;
}

/** Public listing source: published always; drafts also included under `bun dev`. */
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
  "use cache";
  cacheLife("hours");
  cacheTag("recipes", `recipe:${slug}`);

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

    // Drafts are visible only under `bun dev`; 404 them in production.
    if (frontmatter.status === "draft" && !includeDrafts()) {
      return null;
    }

    return { slug, frontmatter, content };
  } catch {
    return null;
  }
}

export async function getAllCategories(): Promise<string[]> {
  const recipes = await getPublishedRecipes();
  const categorySet = new Set<string>();
  for (const recipe of recipes) {
    if (recipe.frontmatter.category) {
      categorySet.add(recipe.frontmatter.category);
    }
  }
  return Array.from(categorySet).sort();
}
