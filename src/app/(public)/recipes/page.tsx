import {
  getPublishedRecipes,
  getDraftRecipes,
  getAllCategories,
  getRecipeIndex,
  anchor,
  includeDrafts,
  type RecipeMeta,
} from "@/lib/recipes";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grandma Hudson's Recipes | Hudson Family",
  description:
    "Grandma Hudson's recipes, digitized and typed out clear and easy to read, in the order they appear in the book.",
};

export default async function RecipesPage() {
  const published = await getPublishedRecipes();
  const categories = await getAllCategories();
  const drafts = includeDrafts() ? await getDraftRecipes() : [];
  const index = await getRecipeIndex();

  // Group published recipes by category, preserving book order within each.
  const groups = new Map<string, RecipeMeta[]>();
  for (const r of published) {
    const c = r.frontmatter.category || "Other";
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c)!.push(r);
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-7 py-10 sm:py-14 motion-safe:animate-fade-in-up">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-3 text-balance">
          Grandma Hudson&rsquo;s Recipes
        </h1>
        <p className="text-muted-foreground text-pretty leading-relaxed max-w-2xl">
          Grandma Hudson&rsquo;s recipes, digitized and typed out clear and easy
          to read, kept in the order they appear in the book.{" "}
          {published.length > 0 ? `${published.length} recipes.` : ""}
        </p>
      </header>

      {published.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-2">No recipes yet</p>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <>
          {/* Chapter index */}
          <nav aria-label="Recipe sections" className="mb-10 flex flex-wrap gap-2">
            {categories.map((c) => (
              <a
                key={c}
                href={`#${anchor(c)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                {c}
                <span className="text-text-dim text-xs">
                  {groups.get(c)?.length ?? 0}
                </span>
              </a>
            ))}
          </nav>

          {/* Sections in book order */}
          <div className="flex flex-col gap-12">
            {categories.map((c) => {
              const items = groups.get(c) ?? [];
              return (
                <section key={c} id={anchor(c)} className="scroll-mt-24">
                  <h2 className="text-2xl font-serif text-foreground font-normal mb-4 pb-2 border-b border-border">
                    {c}
                    <span className="ml-2 text-sm text-text-dim font-sans">
                      {items.length}
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5">
                    {items.map((r) => (
                      <li key={r.slug} className="leading-relaxed">
                        <Link
                          href={`/recipes/${r.slug}`}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {r.frontmatter.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      {drafts.length > 0 && (
        <section className="mt-16 pt-8 border-t border-dashed border-warning/40">
          <h2 className="text-sm font-sans font-semibold tracking-[2px] text-warning uppercase mb-1">
            Drafts, needs review ({drafts.length})
          </h2>
          <p className="text-xs text-text-dim mb-4">
            Visible only in local development.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5">
            {drafts.map((r) => (
              <li key={r.slug} className="leading-relaxed">
                <Link
                  href={`/recipes/${r.slug}`}
                  className="text-foreground hover:text-warning transition-colors"
                >
                  {r.frontmatter.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
