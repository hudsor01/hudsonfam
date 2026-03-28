export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { AddMediaForm, MediaDeleteButton } from "./media-form";

export default async function MemorialMediaPage() {
  await requireRole(["owner"]);

  const media = await prisma.memorialMedia.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Memorial", href: "/dashboard/memorial" }, { label: "Media" }]} />
      <SectionHeader
        title="Memorial Media"
        subtitle={`${media.length} media item${media.length !== 1 ? "s" : ""}`}
        action={{ text: "Back to Memorial", href: "/dashboard/memorial" }}
      />

      {/* Add Media Form */}
      <div className="mt-6 bg-surface border border-border rounded-xl p-5">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase mb-4">
          Add Media
        </h2>
        <AddMediaForm />
      </div>

      {/* Photos Grid */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Photos
          </h2>
          <Badge variant="primary">{photos.length}</Badge>
        </div>

        {photos.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-text-muted">No photos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group bg-surface border border-border rounded-lg overflow-hidden"
              >
                <div className="aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.caption || "Memorial photo"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="px-3 py-2">
                  {photo.caption && (
                    <p className="text-xs text-text-muted truncate">{photo.caption}</p>
                  )}
                  <p className="text-[10px] text-text-dim">Order: {photo.sortOrder}</p>
                </div>
                <MediaDeleteButton mediaId={photo.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos Grid */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Videos
          </h2>
          <Badge variant="primary">{videos.length}</Badge>
        </div>

        {videos.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-text-muted">No videos added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative bg-surface border border-border rounded-lg overflow-hidden px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <svg className="size-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text truncate">{video.url}</p>
                    {video.caption && (
                      <p className="text-xs text-text-muted truncate">{video.caption}</p>
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
