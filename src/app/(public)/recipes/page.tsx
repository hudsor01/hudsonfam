import {
  getPublishedRecipes,
  getDraftRecipes,
  getAllCategories,
  includeDrafts,
} from "@/lib/recipes";
import { RecipeList } from "@/components/public/recipe-list";
import { RecipeCard } from "@/components/public/recipe-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hudson Recipes | Hudson Family",
  description:
    "Grandma Hudson's recipes, digitized and typed out clear and easy to read, so every generation can cook from them.",
};


export default async function RecipesPage() {
  const published = await getPublishedRecipes();
  const categories = await getAllCategories();
  const drafts = includeDrafts() ? await getDraftRecipes() : [];

  const items = published.map((recipe) => ({
    slug: recipe.slug,
    title: recipe.frontmatter.title,
    category: recipe.frontmatter.category,
  }));

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-7 py-10 sm:py-14 motion-safe:animate-fade-in-up">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-3 text-balance">
          Hudson Recipes
        </h1>
        <p className="text-muted-foreground text-pretty leading-relaxed max-w-2xl">
          Grandma Hudson&rsquo;s recipe book has fed this family for generations
          &mdash; pages worn soft, corners stained with butter and flour.
          We&rsquo;re typing every recipe out clear and easy to read, so they
          live on long after the paper does.
        </p>
      </header>

      {items.length > 0 ? (
        <RecipeList recipes={items} categories={categories} />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-2">No recipes yet</p>
          <p className="text-sm text-muted-foreground">
            We&rsquo;re still scanning Grandma Hudson&rsquo;s book. Check back
            soon for the first recipe.
          </p>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="mt-16 pt-8 border-t border-dashed border-warning/40">
          <h2 className="text-sm font-sans font-semibold tracking-[2px] text-warning uppercase mb-1">
            Drafts &mdash; needs review ({drafts.length})
          </h2>
          <p className="text-xs text-text-dim mb-6">
            Visible only in local development. Verify each against the book, then
            set <code>status: published</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {drafts.map((recipe) => (
              <RecipeCard
                key={recipe.slug}
                slug={recipe.slug}
                title={recipe.frontmatter.title}
                category={recipe.frontmatter.category}
                isDraft
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
