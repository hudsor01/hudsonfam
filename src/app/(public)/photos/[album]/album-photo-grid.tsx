"use client";

import { useState } from "react";
import Lightbox from "@/components/public/lightbox";

interface Photo {
  id: string;
  title: string | null;
  caption: string | null;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-bg border border-border hover:border-primary/40 transition-colors cursor-pointer"
          >
            <img
              src={`/api/images/${photo.id}?size=thumbnail`}
              alt={photo.title || photo.caption || "Photo"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
