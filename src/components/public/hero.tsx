import Link from "next/link";
import { RecipeSearch } from "@/components/public/recipe-search";
import type { RecipeIndexEntry } from "@/lib/recipes";

interface HeroProps {
  index: RecipeIndexEntry[];
}

export function Hero({ index }: HeroProps) {
  return (
    <section className="text-center py-16 sm:py-20 px-5 motion-safe:animate-fade-in-up">
      <p className="text-sm tracking-[4px] text-accent mb-3 font-sans uppercase">
        Est. 1934 &bull; Texas
      </p>
      <h1 className="text-4xl sm:text-5xl font-serif text-foreground font-normal mb-3 text-balance">
        The Hudson Family
      </h1>
      <p className="text-muted-foreground italic text-base max-w-xl mx-auto text-pretty mb-8">
        Grandma Hudson&rsquo;s recipes, family photos, and moments that matter &mdash; all in one place.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
        <Link
          href="/recipes"
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-sans font-semibold hover:bg-primary/90 transition-colors min-h-11 inline-flex items-center"
        >
          Browse Recipes
        </Link>
        {index.length > 0 && <RecipeSearch index={index} />}
      </div>
    </section>
  );
}
