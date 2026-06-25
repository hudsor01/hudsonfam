import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import AlbumPhotoGrid from "./album-photo-grid";

interface AlbumPageProps {
  params: Promise<{ album: string }>;
}

/**
 * Metadata is derived from the slug rather than the DB. Under Cache Components,
 * `generateMetadata` feeds the static <head> shell, so an uncached DB read here
 * would block the route from prerendering (and metadata can't stream like body
 * content). The real album title still renders in the page body below.
 *
 * Intentional tradeoff: a non-existent album still gets a title-cased slug
 * title here even though the page body 404s via notFound(). Resolving the album
 * to emit an accurate "Album Not Found" title would require the same uncached
 * `prisma.album.findUnique` the page body does, which would block prerendering
 * under Cache Components. The slug-derived title for 404s is an acceptable cost
 * (404 pages are noindex anyway) to keep this route prerenderable.
 */
export async function generateMetadata({ params }: AlbumPageProps) {
  const { album: slug } = await params;
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${title} | Photos | The Hudson Family`,
    description: `Photo album: ${title}`,
  };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  // Fully dynamic (like the other auth-aware/DB-backed public pages): opt out of
  // prerendering before the uncached collection+photos read under Cache Components.
  await connection();
  const { album: slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      photos: {
        include: { photo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!collection || collection.kind !== "album") {
    notFound();
  }

  // Map CollectionPhoto records to the shape AlbumPhotoGrid expects
  const photos = collection.photos.map((cp) => ({
    id: cp.photo.id,
    title: cp.photo.caption ?? null,
    caption: cp.caption ?? cp.photo.caption ?? null,
    thumbnailPath: cp.photo.thumbnailPath,
    originalPath: cp.photo.originalPath,
    width: cp.photo.width,
    height: cp.photo.height,
    takenAt: cp.photo.takenAt,
  }));

  return (
    <div className="max-w-5xl mx-auto px-7 py-12">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/photos"
          className="text-muted-foreground text-sm hover:text-primary transition-colors"
        >
          Photos
        </Link>
        <span className="text-text-dim text-sm mx-2">/</span>
        <span className="text-foreground text-sm">{collection.title}</span>
      </div>

      <SectionHeader
        title={collection.title}
        subtitle={
          collection.description ||
          `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`
        }
      />

      {photos.length === 0 ? (
        <p className="text-muted-foreground text-sm mt-8">
          This album is empty.
        </p>
      ) : (
        <AlbumPhotoGrid photos={photos} />
      )}
    </div>
  );
}
