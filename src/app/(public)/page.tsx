import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Hero } from "@/components/public/hero";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/section-header";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";
import Link from "next/link";
import { getRecipeIndex, type RecipeIndexEntry } from "@/lib/recipes";
import { FEATURED_RECIPE_SLUGS } from "@/lib/featured-recipes";

export default async function HomePage() {
  await connection();

  // Parallel fetch — eliminates waterfall
  const [photos, index] = await Promise.all([
    prisma.photo.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        thumbnailPath: true,
        title: true,
      },
    }),
    getRecipeIndex(),
  ]);

  // Featured recipe resolution — zero extra I/O (index already in memory)
  const featuredRecipes = FEATURED_RECIPE_SLUGS
    .map((slug) => index.find((e) => e.slug === slug))
    .filter((e): e is RecipeIndexEntry => e !== undefined);

  return (
    <div>
      <Hero index={index} />

      <Separator />

      {/* Recipes section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader label="RECIPES" action={{ text: "View all recipes", href: "/recipes" }} />
        {featuredRecipes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredRecipes.map((recipe) => (
              <Link key={recipe.slug} href={`/recipes/${recipe.slug}`}>
                <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-card transition-all group">
                  <p className="text-sm text-accent font-sans font-semibold tracking-[2px] uppercase mb-1.5">
                    {recipe.category}
                  </p>
                  <h3 className="text-lg font-serif text-foreground leading-snug text-balance group-hover:text-primary transition-colors">
                    {recipe.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-dim italic">No featured recipes</p>
        )}
      </section>

      <Separator />

      {/* Photos section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader label="PHOTOS" action={{ text: "View all photos", href: "/photos" }} />
        <div className="bg-card border border-border rounded-xl p-5">
          {photos.length > 0 ? (
            <PhotoGridPreview photos={photos} />
          ) : (
            <p className="text-sm text-text-dim italic">No photos yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
