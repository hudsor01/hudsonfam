import { connection } from "next/server";
import { Hero } from "@/components/public/hero";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/section-header";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";
import { getRecipeIndex } from "@/lib/recipes";
import { getFeaturedPhotos } from "@/lib/photo-queries";

export default async function HomePage() {
  await connection();

  // Parallel fetch — eliminates waterfall. The recipe index powers the Hero's
  // search; the homepage Photos section is driven by the curated featured collection.
  const [featuredPhotos, index] = await Promise.all([
    getFeaturedPhotos(),
    getRecipeIndex(),
  ]);

  return (
    <div>
      <Hero index={index} />

      <Separator />

      {/* Photos section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <SectionHeader label="PHOTOS" action={{ text: "View all photos", href: "/photos" }} />
        <div className="bg-card border border-border rounded-xl p-5">
          {featuredPhotos.length > 0 ? (
            <PhotoGridPreview photos={featuredPhotos} />
          ) : (
            <p className="text-sm text-text-dim italic">No featured photos yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
