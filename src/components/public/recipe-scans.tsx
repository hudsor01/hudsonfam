"use client";

import Image from "next/image";
import { useState } from "react";
import Lightbox from "@/components/public/lightbox";

interface RecipeScansProps {
  scans: string[];
  title: string;
}

export function RecipeScans({ scans, title }: RecipeScansProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (scans.length === 0) return null;

  // Adapt the recipe scan paths to the shared Lightbox photo shape.
  const photos = scans.map((src, i) => ({
    id: String(i),
    title: scans.length > 1 ? `${title} — page ${i + 1}` : title,
    caption: null,
    thumbnailPath: src,
    originalPath: src,
    width: 1200,
    height: 1600,
  }));

  return (
    <>
      <div className="flex flex-col gap-4">
        {scans.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="group block w-full overflow-hidden rounded-xl border border-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Zoom original scan${scans.length > 1 ? `, page ${i + 1}` : ""}`}
          >
            <Image
              src={src}
              alt={
                scans.length > 1
                  ? `Original scanned page ${i + 1} of ${title}`
                  : `Original scanned page of ${title}`
              }
              width={1200}
              height={1600}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              unoptimized
            />
          </button>
        ))}
        <p className="text-xs text-text-dim italic text-center">
          Click a page to view the original scan full size.
        </p>
      </div>

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
