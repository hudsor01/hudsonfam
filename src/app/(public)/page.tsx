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
  const [events, photos, index] = await Promise.all([
    prisma.event.findMany({
      where: {
        visibility: "PUBLIC",
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        startDate: true,
        location: true,
      },
    }),
    prisma.photo.findMany({
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
        {featuredRecipes.length > 0 && (
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

      <Separator />

      {/* Events section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader label="EVENTS" action={{ text: "View all events", href: "/events" }} />
        <div className="bg-card border border-border rounded-xl p-5">
          {events.length > 0 ? (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <div className="flex-shrink-0 size-10 rounded-lg bg-accent/15 flex items-center justify-center">
                    <span className="text-accent text-sm font-bold font-sans">
                      {new Date(event.startDate).toLocaleDateString("en-US", { day: "numeric" })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
                    <p className="text-sm text-text-dim">
                      {new Date(event.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-dim italic">No upcoming events</p>
          )}
        </div>
      </section>
    </div>
  );
}
