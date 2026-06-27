"use client";

import Image from "next/image";
import { useState } from "react";
import Lightbox from "@/components/public/lightbox";

interface Photo {
  id: string;
  title: string | null;
  caption: string | null;
  thumbnailPath: string;
  originalPath: string;
  width: number;
  height: number;
  takenAt: Date | null;
}

interface AlbumPhotoGridProps {
  photos: Photo[];
}

export default function AlbumPhotoGrid({ photos }: AlbumPhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="max-sm:flex max-sm:overflow-x-auto max-sm:snap-x max-sm:snap-mandatory max-sm:gap-3 max-sm:-mx-5 max-sm:px-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="perspective-midrange max-sm:snap-center max-sm:shrink-0 max-sm:w-[80vw] group relative aspect-square overflow-hidden rounded-lg bg-background border border-border hover:border-primary/40 transition-colors cursor-pointer"
          >
            <Image
              src={`/api/images/${photo.id}?size=thumbnail`}
              alt="The Hudson Family photo"
              width={400}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 group-hover:rotate-y-1 hover:brightness-110 hover:saturate-110 transition-all duration-500"
              loading="lazy"
              unoptimized
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
