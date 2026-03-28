"use client";

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
            className="max-sm:snap-center max-sm:shrink-0 max-sm:w-[80vw] group relative aspect-square overflow-hidden rounded-lg bg-background border border-border hover:border-primary/40 transition-colors cursor-pointer"
          >
            <img
              src={photo.thumbnailPath}
              alt={photo.title || photo.caption || "Photo"}
              className="w-full h-full object-cover group-hover:scale-105 hover:brightness-110 hover:saturate-110 transition-all duration-500"
              loading="lazy"
            />
            {/* Hover overlay with title */}
            {photo.title && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{photo.title}</p>
              </div>
            )}
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
