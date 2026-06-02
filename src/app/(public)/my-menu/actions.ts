"use server";

import { getRecipeBySlug } from "@/lib/recipes";

/**
 * Slim recipe shape for the printable menu — just what a cook needs on paper.
 * The menu lives in localStorage as {slug,title,category} only, so the full
 * ingredients/instructions (server-side MDX) are fetched on demand for the
 * picked slugs when the user opens /my-menu, so printing yields cookable recipes.
 */
export interface MenuRecipe {
  slug: string;
  title: string;
  category: string;
  servings: string | null;
  prepTime: string | null;
  cookTime: string | null;
  ingredients: string[];
  instructions: string[];
}

/**
 * Resolve full recipe details for the given menu slugs (picked items only — not
 * the whole 1,000-recipe corpus). Slugs come from client localStorage, so each
 * is validated by getRecipeBySlug (path-traversal guarded). Unknown/draft slugs
 * are dropped. Order follows the input.
 */
export async function getMenuRecipes(slugs: string[]): Promise<MenuRecipe[]> {
  const unique = Array.from(new Set(slugs)).slice(0, 200);
  const resolved = await Promise.all(unique.map((s) => getRecipeBySlug(s)));

  const bySlug = new Map<string, MenuRecipe>();
  for (const r of resolved) {
    if (!r) continue;
    bySlug.set(r.slug, {
      slug: r.slug,
      title: r.frontmatter.title,
      category: r.frontmatter.category,
      servings: r.frontmatter.servings ?? null,
      prepTime: r.frontmatter.prepTime ?? null,
      cookTime: r.frontmatter.cookTime ?? null,
      ingredients: r.frontmatter.ingredients,
      instructions: r.frontmatter.instructions,
    });
  }

  return unique
    .map((s) => bySlug.get(s))
    .filter((x): x is MenuRecipe => x !== undefined);
}
