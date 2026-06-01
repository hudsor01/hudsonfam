"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RecipeCard } from "@/components/public/recipe-card";

interface RecipeListItem {
  slug: string;
  title: string;
  category: string;
  thumbnail: string | null;
}

interface RecipeListProps {
  recipes: RecipeListItem[];
  categories: string[];
}

export function RecipeList({ recipes, categories }: RecipeListProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visible = activeCategory
    ? recipes.filter((r) => r.category === activeCategory)
    : recipes;

  return (
    <>
      {/* Category filters */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            aria-pressed={!activeCategory}
          >
            <Badge variant={!activeCategory ? "primary" : "outline"}>All</Badge>
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              <Badge
                variant={activeCategory === category ? "primary" : "outline"}
              >
                {category}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((recipe) => (
            <RecipeCard
              key={recipe.slug}
              slug={recipe.slug}
              title={recipe.title}
              category={recipe.category}
              thumbnail={recipe.thumbnail}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-2">
            No recipes in this category
          </p>
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all recipes
          </button>
        </div>
      )}
    </>
  );
}
