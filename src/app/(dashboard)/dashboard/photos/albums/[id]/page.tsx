import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { SortablePhotoGrid } from "@/components/dashboard/sortable-photo-grid";
import { PhotoLibraryPicker } from "../../../memorial/media/photo-library-picker";
import { CollectionForm } from "../collection-form";
import { DeleteCollectionButton } from "./delete-collection-button";
import { updateCollection } from "@/lib/collection-actions";
import { getUncollectedPhotos } from "@/lib/photo-queries";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCollectionPage({ params }: Props) {
  await connection();
  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      photos: {
        include: { photo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  const photoItems = collection.photos.map((cp) => ({
    photoId: cp.photoId,
    caption: cp.caption ?? cp.photo.caption,
    layout: cp.layout,
  }));

  // For album-kind collections: fetch uncollected photos as the picker library.
  // Surface collections (memorial, featured) do not use this picker.
  const uncollectedPhotos =
    collection.kind === "album" ? await getUncollectedPhotos() : [];

  const libraryPhotos = uncollectedPhotos.map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption,
  }));

  async function handleUpdate(input: { title: string; description?: string }) {
    "use server";
    await updateCollection(id, input);
  }

  return (
    <div>
      <DashboardBreadcrumbs
        items={[
          { label: "Photos", href: "/dashboard/photos" },
          { label: "Collections", href: "/dashboard/photos/albums" },
          { label: collection.title },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title={collection.kind === "surface" ? `${collection.title} (Surface)` : "Edit Collection"}
          subtitle={`${collection.photos.length} photo${collection.photos.length !== 1 ? "s" : ""}`}
        />
        {collection.kind === "album" && (
          <div className="mt-1 shrink-0">
            <DeleteCollectionButton
              collectionId={collection.id}
              collectionTitle={collection.title}
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <CollectionForm
          action={handleUpdate}
          initial={{
            title: collection.title,
            description: collection.description,
          }}
        />
      </div>

      <div className="mt-8">
        <h3 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
          Photos
        </h3>
        <SortablePhotoGrid collectionId={collection.id} items={photoItems} />
      </div>

      {collection.kind === "album" && (
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase mb-4">
            Add from Library
          </h3>
          <PhotoLibraryPicker
            collectionId={collection.id}
            photos={libraryPhotos}
            label={collection.title}
          />
        </div>
      )}
    </div>
  );
}
