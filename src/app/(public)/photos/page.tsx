export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";

export const metadata = {
  title: "Photos | The Hudson Family",
  description: "Browse our family photo albums",
};

export default async function PhotosPage() {
  const albums = await prisma.album.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { photos: true } },
      photos: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { id: true, thumbnailPath: true },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-7 py-12">
      <SectionHeader title="Photos" subtitle="Family moments captured" />

      {albums.length === 0 ? (
        <p className="text-muted-foreground text-sm mt-8">
          No albums yet. Check back soon.
        </p>
      ) : (
        <div className="@container grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-6 mt-8">
          {albums.map((album) => {
            const coverPhoto = album.photos[0] || null;
            const photoCount = album._count.photos;

            return (
              <Link
                key={album.id}
                href={`/photos/${album.slug}`}
                className="group block"
              >
                <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
                  {/* Cover image */}
                  <div className="aspect-[4/3] bg-background overflow-hidden">
                    {coverPhoto ? (
                      <img
                        src={coverPhoto.thumbnailPath}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Album info */}
                  <div className="p-4">
                    <h2 className="text-foreground font-serif text-lg group-hover:text-primary transition-colors text-balance">
                      {album.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      {album.date && (
                        <span className="text-muted-foreground text-xs">
                          {new Date(album.date).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      <span className="text-text-dim text-xs">
                        {photoCount} {photoCount === 1 ? "photo" : "photos"}
                      </span>
                    </div>
                    {album.description && (
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2 text-pretty">
                        {album.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
