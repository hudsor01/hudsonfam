import Link from "next/link";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";

export default async function CollectionsPage() {
  await connection();
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { photos: true } },
    },
  });

  const albumCollections = collections.filter((c) => c.kind === "album");
  const surfaceCollections = collections.filter((c) => c.kind === "surface");

  return (
    <div>
      <SectionHeader
        title="Collections"
        subtitle="Organize photos into collections"
        action={{ text: "+ New Collection", href: "/dashboard/photos/albums/new" }}
      />

      {albumCollections.length === 0 ? (
        <Card padding="lg" className="text-center mt-6">
          <p className="text-muted-foreground text-sm">No collections yet.</p>
          <Link
            href="/dashboard/photos/albums/new"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Create your first collection
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {albumCollections.map((col) => (
            <a
              key={col.id}
              href={`/dashboard/photos/albums/${col.id}`}
              className="block"
            >
              <Card hover padding="md">
                <h3 className="text-foreground font-serif text-lg">{col.title}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-text-dim text-xs">
                    {col._count.photos} photo{col._count.photos !== 1 ? "s" : ""}
                  </span>
                </div>
                {col.description && (
                  <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                    {col.description}
                  </p>
                )}
              </Card>
            </a>
          ))}
        </div>
      )}

      {surfaceCollections.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
            Site Surfaces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {surfaceCollections.map((col) => (
              <a
                key={col.id}
                href={`/dashboard/photos/albums/${col.id}`}
                className="block"
              >
                <Card hover padding="md">
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground font-serif text-lg">{col.title}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      surface
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-text-dim text-xs">
                      {col._count.photos} photo{col._count.photos !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {col.description && (
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
