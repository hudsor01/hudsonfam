"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMenu } from "@/components/public/menu-provider";
import { Button } from "@/components/ui/button";
import { getMenuRecipes, type MenuRecipe } from "./actions";

export function MenuView() {
  const { items, remove, clear, count } = useMenu();

  // Full recipe details (ingredients + instructions) for the picked slugs,
  // fetched on demand so the printed menu is cookable, not just a name list.
  // The menu in localStorage only holds {slug,title,category}; the MDX content
  // is server-side. Screen shows the compact list; print shows full recipes.
  const [details, setDetails] = useState<MenuRecipe[]>([]);

  useEffect(() => {
    // Nothing to fetch when the menu is empty — and the print section isn't
    // rendered in that case (count === 0 shows the empty state), so stale
    // details are never displayed. Early-return keeps the only setState calls
    // inside the async callbacks (not synchronously in the effect body).
    if (items.length === 0) return;
    let cancelled = false;
    getMenuRecipes(items.map((i) => i.slug))
      .then((recipes) => {
        if (!cancelled) setDetails(recipes);
      })
      .catch(() => {
        if (!cancelled) setDetails([]);
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Group items by category, preserving insertion order within each group.
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  const detailBySlug = new Map(details.map((r) => [r.slug, r]));

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-2 text-balance">
            My Menu
          </h1>
          {count > 0 && (
            <p className="text-muted-foreground">
              {count} recipe{count === 1 ? "" : "s"} saved
            </p>
          )}
        </div>

        {count > 0 && (
          <div className="no-print flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => window.print()}
            >
              Print menu
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              onClick={clear}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {count === 0 ? (
        /* Empty state */
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-3">
            Your menu is empty
          </p>
          <p className="text-muted-foreground mb-6">
            Add recipes from the recipes page to build your menu.
          </p>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/recipes">Browse recipes</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* On-screen: compact grouped list with remove (hidden in print). */}
          <div className="no-print flex flex-col gap-10">
            {Array.from(groups.entries()).map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="text-xl font-serif text-foreground font-normal mb-3 pb-2 border-b border-border">
                  {category}
                  <span className="ml-2 text-sm text-text-dim font-sans">
                    {categoryItems.length}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {categoryItems.map((item) => (
                    <li
                      key={item.slug}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <Link
                        href={`/recipes/${item.slug}`}
                        className="text-foreground hover:text-primary transition-colors leading-relaxed min-w-0 flex-1 text-base sm:text-lg"
                      >
                        {item.title}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => remove(item.slug)}
                        aria-label={`Remove ${item.title} from menu`}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Print only: full cookable recipes (ingredients + instructions),
              grouped by course, in the same order as the on-screen list. */}
          <div className="hidden print-menu flex-col gap-8">
            {Array.from(groups.entries()).map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="menu-course text-xl font-serif text-foreground font-normal mb-4 pb-2 border-b border-border">
                  {category}
                </h2>
                <div className="flex flex-col gap-6">
                  {categoryItems.map((item) => {
                    const recipe = detailBySlug.get(item.slug);
                    return (
                      <article key={item.slug} className="menu-recipe">
                        <h3 className="text-lg font-serif text-foreground font-normal mb-1">
                          {item.title}
                        </h3>
                        {recipe &&
                          (recipe.servings ||
                            recipe.prepTime ||
                            recipe.cookTime) && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {[
                                recipe.servings && `Serves ${recipe.servings}`,
                                recipe.prepTime && `Prep ${recipe.prepTime}`,
                                recipe.cookTime && `Cook ${recipe.cookTime}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        {recipe ? (
                          <>
                            {recipe.ingredients.length > 0 && (
                              <>
                                <p className="text-sm font-semibold text-foreground mt-2 mb-1">
                                  Ingredients
                                </p>
                                <ul className="list-disc pl-5 text-foreground flex flex-col gap-0.5">
                                  {recipe.ingredients.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {recipe.instructions.length > 0 && (
                              <>
                                <p className="text-sm font-semibold text-foreground mt-3 mb-1">
                                  Instructions
                                </p>
                                <ol className="list-decimal pl-5 text-foreground flex flex-col gap-1">
                                  {recipe.instructions.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Recipe at /recipes/{item.slug}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* Back to recipes link */}
      {count > 0 && (
        <div className="no-print mt-10 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/recipes"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            &larr; Back to recipes
          </Link>
          <p className="text-xs text-text-dim">
            Menu saved locally — no account required
          </p>
        </div>
      )}
    </div>
  );
}
