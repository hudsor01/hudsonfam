import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { SortablePhotoGrid } from "@/components/dashboard/sortable-photo-grid";
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

  const photoItems =
    memorial?.photos.map((cp) => ({
      photoId: cp.photoId,
      caption: cp.caption ?? cp.photo.caption,
      layout: cp.layout,
    })) ?? [];

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Memorial", href: "/dashboard/memorial" }, { label: "Photos" }]} />
      <SectionHeader
        title="Memorial Photos"
        subtitle={`${photoItems.length} photo${photoItems.length !== 1 ? "s" : ""} on the memorial page`}
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
    </div>
  );
}
