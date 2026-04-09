import Image from "next/image";
import Link from "next/link";

interface Photo {
  id: string;
  thumbnailPath: string;
  title: string | null;
}

interface PhotoGridPreviewProps {
  photos: Photo[];
}

export function PhotoGridPreview({ photos }: PhotoGridPreviewProps) {
  const displayPhotos = photos.slice(0, 6);

  return (
    <Link href="/photos" className="block group">
      <div className="grid grid-cols-3 gap-1.5">
        {displayPhotos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-square rounded-md overflow-hidden bg-background"
          >
            <Image
              src={photo.thumbnailPath}
              alt={photo.title || "Photo"}
              width={400}
              height={300}
              className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
              unoptimized
            />
          </div>
        ))}
        {/* Fill empty slots with placeholders */}
        {Array.from({ length: Math.max(0, 6 - displayPhotos.length) }).map(
          (_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-square rounded-md bg-background border border-border/50"
            />
          )
        )}
      </div>
    </Link>
  );
}
