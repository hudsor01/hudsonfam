export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import AlbumPhotoGrid from "./album-photo-grid";

interface AlbumPageProps {
  params: Promise<{ album: string }>;
}

export async function generateMetadata({ params }: AlbumPageProps) {
  const { album: slug } = await params;
  const album = await prisma.album.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });
  if (!album) return { title: "Album Not Found" };
  return {
    title: `${album.title} | Photos | The Hudson Family`,
    description: album.description || `Photo album: ${album.title}`,
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { album: slug } = await params;

  const album = await prisma.album.findUnique({
    where: { slug },
    include: {
      photos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          caption: true,
          width: true,
          height: true,
          takenAt: true,
        },
      },
    },
  });

  if (!album) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-7 py-12">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/photos"
          className="text-text-muted text-sm hover:text-primary transition-colors"
        >
          Photos
        </Link>
        <span className="text-text-dim text-sm mx-2">/</span>
        <span className="text-text text-sm">{album.title}</span>
      </div>

      <SectionHeader
        title={album.title}
        subtitle={
          album.description ||
          `${album.photos.length} ${album.photos.length === 1 ? "photo" : "photos"}`
        }
      />

      {album.photos.length === 0 ? (
        <p className="text-text-muted text-sm mt-8">
          This album is empty.
        </p>
      ) : (
        <AlbumPhotoGrid photos={album.photos} />
      )}
    </div>
  );
}
