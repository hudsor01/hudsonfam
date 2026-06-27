import Image from "next/image";
import Link from "next/link";

interface Photo {
  id: string;
  thumbnailPath: string;
}

interface PhotoGridPreviewProps {
  photos: Photo[];
}

export function PhotoGridPreview({ photos }: PhotoGridPreviewProps) {
  return (
    <Link href="/photos" className="block group">
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-square rounded-md overflow-hidden bg-background"
          >
            <Image
              src={`/api/images/${photo.id}?size=thumbnail`}
              alt="The Hudson Family photo"
              width={400}
              height={400}
              className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
              unoptimized
            />
          </div>
        ))}
      </div>
    </Link>
  );
}
