export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";

export default async function AlbumsPage() {
  const albums = await prisma.album.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { photos: true } },
    },
  });

  return (
    <div>
      <SectionHeader
        title="Albums"
        subtitle="Organize photos into albums"
        action={{ text: "+ New Album", href: "/dashboard/photos/albums/new" }}
      />

      {albums.length === 0 ? (
        <Card padding="lg" className="text-center mt-6">
          <p className="text-text-muted text-sm">No albums yet.</p>
          <a
            href="/dashboard/photos/albums/new"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Create your first album
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {albums.map((album) => (
            <a
              key={album.id}
              href={`/dashboard/photos/albums/${album.id}`}
              className="block"
            >
              <Card hover padding="md">
                <h3 className="text-text font-serif text-lg">{album.title}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  {album.date && (
                    <span className="text-text-muted text-xs">
                      {new Date(album.date).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  <span className="text-text-dim text-xs">
                    {album._count.photos} photo{album._count.photos !== 1 ? "s" : ""}
                  </span>
                </div>
                {album.description && (
                  <p className="text-text-muted text-sm mt-2 line-clamp-2">
                    {album.description}
                  </p>
                )}
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
