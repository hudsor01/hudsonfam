import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Hero } from "@/components/public/hero";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/section-header";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";
import { getRecipeIndex } from "@/lib/recipes";

export default async function HomePage() {
  await connection();

  // Parallel fetch — eliminates waterfall. The recipe index powers the Hero's
  // search; the homepage no longer renders a featured-recipes section.
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

  return (
    <div>
      <Hero index={index} />

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
