import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { requireRole } from "@/lib/session";
import { FEATURED_SLUG, FEATURED_MAX } from "@/lib/featured";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { SortablePhotoGrid } from "@/components/dashboard/sortable-photo-grid";
import { PhotoLibraryPicker } from "@/app/(dashboard)/dashboard/memorial/media/photo-library-picker";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";

export default async function FeaturedPhotosPage() {
  await connection();
  await requireRole(["owner"]);

  // Resolve the featured surface collection by slug
  const featured = await prisma.collection.findUnique({
    where: { slug: FEATURED_SLUG },
    include: {
      photos: {
        include: { photo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Graceful absent state — collection not seeded until Phase 40
  if (!featured) {
    return (
      <div>
        <DashboardBreadcrumbs
          items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Featured" }]}
        />
        <SectionHeader
          title="Featured Photos"
          subtitle="Manage the homepage 3×3 featured grid"
          action={{ text: "Back to Photos", href: "/dashboard/photos" }}
        />
        <div className="mt-8 bg-card border border-border rounded-xl px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Featured collection is not set up yet. It will be seeded in a future setup step.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Expected collection slug: &ldquo;{FEATURED_SLUG}&rdquo;
          </p>
        </div>
      </div>
    );
  }

  // Build photo items and library (all photos not already featured)
  const featuredPhotoIds = new Set(featured.photos.map((cp) => cp.photoId));

  const photoItems = featured.photos.map((cp) => ({
    photoId: cp.photoId,
    caption: cp.caption ?? cp.photo.caption,
    layout: cp.layout,
  }));

  const allPhotos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, caption: true },
  });
  const libraryPhotos = allPhotos.filter((p) => !featuredPhotoIds.has(p.id));

  // Map featured photos for the PhotoGridPreview (grid-cols-3, mirrors homepage)
  const previewPhotos = featured.photos.map((cp) => ({
    id: cp.photoId,
    thumbnailPath: cp.photo.thumbnailPath ?? "",
  }));

  const isFull = photoItems.length >= FEATURED_MAX;

  return (
    <div>
      <DashboardBreadcrumbs
        items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Featured" }]}
      />
      <SectionHeader
        title="Featured Photos"
        subtitle={`${photoItems.length} / ${FEATURED_MAX} featured — controls the homepage 3×3 grid`}
        action={{ text: "Back to Photos", href: "/dashboard/photos" }}
      />

      {/* ── Live Preview ── */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Live Preview
          </h2>
          <Badge variant="primary">{photoItems.length} / {FEATURED_MAX}</Badge>
          {isFull && (
            <span className="text-xs text-muted-foreground">(cap reached)</span>
          )}
        </div>

        {previewPhotos.length > 0 ? (
          <div className="max-w-md">
            <PhotoGridPreview photos={previewPhotos} />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-8 text-center max-w-md">
            <p className="text-sm text-muted-foreground">
              No featured photos yet. Add photos from the library below.
            </p>
          </div>
        )}
      </div>

      {/* ── Current Featured Photos — sortable/reorderable ── */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Featured Order
          </h2>
          <Badge variant="primary">{photoItems.length}</Badge>
        </div>

        <SortablePhotoGrid collectionId={featured.id} items={photoItems} />
      </div>

      {/* ── Add from library ── */}
      <div className="mt-6 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase">
            Add from Library
          </h3>
          {isFull && (
            <span className="text-xs text-muted-foreground">
              Remove a photo to add another
            </span>
          )}
        </div>
        <PhotoLibraryPicker
          collectionId={featured.id}
          photos={libraryPhotos}
          label="featured collection"
          disabled={isFull}
        />
      </div>
    </div>
  );
}
