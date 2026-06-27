import type { Metadata } from "next";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import AlbumPhotoGrid from "@/components/public/album-photo-grid";
import { getUncollectedPhotos } from "@/lib/photo-queries";

export const metadata: Metadata = {
  title: "Photos",
  description: "Browse our family photos",
};

export default async function PhotosPage() {
  await connection();
  const [collections, allPhotos] = await Promise.all([
    prisma.collection.findMany({
      where: { kind: "album" },
      include: {
        _count: { select: { photos: true } },
        photos: {
          include: { photo: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { date: "desc" },
    }),
    // All Photos = photos in NO album-kind collection (PHOTOS-02 / getUncollectedPhotos).
    getUncollectedPhotos(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-7 py-12">
      <SectionHeader title="Photos" subtitle="Family moments captured" />

      {/* Albums */}
      {collections.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-5">
            Albums
          </h2>
          <div className="@container grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-6">
            {collections.map((collection) => {
              // Prefer explicit coverPhotoId; fall back to first photo in sortOrder
              const coverPhotoId =
                collection.coverPhotoId ??
                collection.photos[0]?.photo.id ??
                null;
              const photoCount = collection._count.photos;

              return (
                <Link
                  key={collection.id}
                  href={`/photos/${collection.slug}`}
                  className="group block"
                >
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
                    {/* Cover image */}
                    <div className="aspect-[4/3] bg-background overflow-hidden">
                      {coverPhotoId ? (
                        <Image
                          src={`/api/images/${coverPhotoId}?size=thumbnail`}
                          alt={collection.title}
                          width={800}
                          height={400}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-text-dim"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Collection info */}
                    <div className="p-4">
                      <h3 className="text-foreground font-serif text-lg group-hover:text-primary transition-colors text-balance">
                        {collection.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        {collection.date && (
                          <span className="text-muted-foreground text-xs">
                            {new Date(collection.date).toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="text-text-dim text-xs">
                          {photoCount} {photoCount === 1 ? "photo" : "photos"}
                        </span>
                      </div>
                      {collection.description && (
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-2 text-pretty">
                          {collection.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* All photos */}
      <section className="mt-12">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
          All Photos
        </h2>
        {allPhotos.length > 0 ? (
          <AlbumPhotoGrid photos={allPhotos} />
        ) : (
          <p className="text-muted-foreground text-sm mt-8">
            No photos yet. Check back soon.
          </p>
        )}
      </section>
    </div>
  );
}
