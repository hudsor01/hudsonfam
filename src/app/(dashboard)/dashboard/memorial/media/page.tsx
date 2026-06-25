import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { SortablePhotoGrid } from "@/components/dashboard/sortable-photo-grid";
import { AddVideoForm, MediaDeleteButton } from "./media-form";
import { PhotoLibraryPicker } from "./photo-library-picker";

export default async function MemorialMediaPage() {
  await connection();
  await requireRole(["owner"]);

  // Fetch memorial collection (surface collection with slug "memorial")
  const memorial = await prisma.collection.findUnique({
    where: { slug: "memorial" },
    include: {
      photos: {
        include: { photo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Fetch all library photos not already in the memorial collection
  const memorialPhotoIds = new Set(memorial?.photos.map((cp) => cp.photoId) ?? []);
  const allPhotos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, caption: true },
  });
  const libraryPhotos = allPhotos.filter((p) => !memorialPhotoIds.has(p.id));

  // Fetch videos (MemorialMedia type:video — unchanged)
  const videos = await prisma.memorialMedia.findMany({
    where: { type: "video" },
    orderBy: { sortOrder: "asc" },
  });

  const photoItems =
    memorial?.photos.map((cp) => ({
      photoId: cp.photoId,
      caption: cp.caption ?? cp.photo.caption,
      layout: cp.layout,
    })) ?? [];

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Memorial", href: "/dashboard/memorial" }, { label: "Media" }]} />
      <SectionHeader
        title="Memorial Media"
        subtitle={`${photoItems.length} photo${photoItems.length !== 1 ? "s" : ""}, ${videos.length} video${videos.length !== 1 ? "s" : ""}`}
        action={{ text: "Back to Memorial", href: "/dashboard/memorial" }}
      />

      {/* ── Photos ── */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Photos
          </h2>
          <Badge variant="primary">{photoItems.length}</Badge>
        </div>

        {/* Current memorial photos — sortable/reorderable */}
        {memorial ? (
          <SortablePhotoGrid collectionId={memorial.id} items={photoItems} />
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Memorial collection not found. Create a collection with slug &ldquo;memorial&rdquo;.
            </p>
          </div>
        )}

        {/* Add from library */}
        {memorial && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase mb-4">
              Add from Library
            </h3>
            <PhotoLibraryPicker collectionId={memorial.id} photos={libraryPhotos} />
          </div>
        )}
      </div>

      {/* ── Videos ── (unchanged) */}
      <div className="mt-8">
        {/* Add Video Form */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase mb-4">
            Add Video
          </h2>
          <AddVideoForm />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Videos
          </h2>
          <Badge variant="primary">{videos.length}</Badge>
        </div>

        {videos.length === 0 ? (
          <div className="bg-card border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No videos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative bg-card border border-border rounded-lg overflow-hidden px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <svg className="size-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{video.url}</p>
                    {video.caption && (
                      <p className="text-xs text-muted-foreground truncate">{video.caption}</p>
                    )}
                    <p className="text-[10px] text-text-dim">Order: {video.sortOrder}</p>
                  </div>
                </div>
                <MediaDeleteButton mediaId={video.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
