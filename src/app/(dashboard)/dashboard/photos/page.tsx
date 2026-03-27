export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { deletePhoto } from "@/lib/dashboard-actions";

export default async function PhotosPage() {
  const photos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      album: { select: { title: true } },
    },
    take: 60,
  });

  const totalPhotos = await prisma.photo.count();

  return (
    <div>
      <SectionHeader
        title="Photos"
        subtitle={`${totalPhotos} photos total`}
        action={{ text: "+ Upload", href: "/dashboard/photos/upload" }}
      />

      <div className="flex gap-3 mt-4 mb-6">
        <a
          href="/dashboard/photos/albums"
          className="text-sm text-text-muted hover:text-text bg-surface border border-border rounded-lg px-4 py-2 transition-colors"
        >
          Manage Albums
        </a>
        <a
          href="/dashboard/photos/upload"
          className="text-sm text-white bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 transition-colors"
        >
          Upload Photos
        </a>
      </div>

      {photos.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-text-muted text-sm">No photos uploaded yet.</p>
          <a
            href="/dashboard/photos/upload"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Upload your first photo
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-surface border border-border rounded-lg overflow-hidden"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={`/api/images/${photo.id}?size=thumbnail`}
                  alt={photo.title || "Photo"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-text truncate">
                  {photo.title || "Untitled"}
                </p>
                {photo.album && (
                  <p className="text-xs text-text-dim truncate">
                    {photo.album.title}
                  </p>
                )}
              </div>
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <form
                  action={async () => {
                    "use server";
                    await deletePhoto(photo.id);
                  }}
                >
                  <button
                    type="submit"
                    className="bg-red-500/90 hover:bg-red-500 text-white text-xs rounded px-2 py-1"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
