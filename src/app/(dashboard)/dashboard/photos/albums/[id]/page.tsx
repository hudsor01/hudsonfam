export const dynamic = "force-dynamic";

import Image from "next/image";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { AlbumForm } from "../album-form";
import { updateAlbum } from "@/lib/dashboard-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAlbumPage({ params }: Props) {
  const { id } = await params;

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      _count: { select: { photos: true } },
      photos: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      },
    },
  });

  if (!album) {
    notFound();
  }

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updateAlbum(id, formData);
  };

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Albums", href: "/dashboard/photos/albums" }, { label: album.title }]} />
      <SectionHeader
        title="Edit Album"
        subtitle={`${album.title} (${album._count.photos} photos)`}
      />
      <div className="mt-6">
        <AlbumForm
          action={boundUpdate}
          showCoverPhoto
          initial={{
            title: album.title,
            slug: album.slug,
            description: album.description,
            date: album.date
              ? new Date(album.date).toISOString().split("T")[0]
              : null,
            coverPhotoId: album.coverPhotoId,
          }}
        />
      </div>

      {/* Photos in album */}
      {album.photos.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
            Photos in Album
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {album.photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square bg-card border border-border rounded-lg overflow-hidden"
              >
                <Image
                  src={`/api/images/${photo.id}?size=thumbnail`}
                  alt={photo.title || "Photo"}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover hover:brightness-110 hover:saturate-110 transition-all"
                  loading="lazy"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
