"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { addPhotoToCollection } from "@/lib/collection-actions";

type LibraryPhoto = {
  id: string;
  title: string | null;
  caption: string | null;
};

interface PhotoLibraryPickerProps {
  collectionId: string;
  photos: LibraryPhoto[];
}

export function PhotoLibraryPicker({ collectionId, photos }: PhotoLibraryPickerProps) {
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function handleAdd(photoId: string) {
    setAdding(photoId);
    try {
      await addPhotoToCollection(collectionId, photoId);
      setAdded((prev) => new Set(prev).add(photoId));
      toast.success("Photo added to memorial");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add photo");
    } finally {
      setAdding(null);
    }
  }

  const visible = photos.filter((p) => !added.has(p.id));

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        All library photos are already in the memorial collection.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {visible.map((photo) => (
        <div
          key={photo.id}
          className="relative group bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="aspect-square">
            <Image
              src={`/api/images/${photo.id}?size=thumbnail`}
              alt={photo.caption ?? photo.title ?? "Photo"}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              loading="lazy"
              unoptimized
            />
          </div>
          <div className="px-3 py-2">
            {(photo.title || photo.caption) && (
              <p className="text-xs text-muted-foreground truncate">
                {photo.title ?? photo.caption}
              </p>
            )}
          </div>
          <button
            disabled={adding === photo.id}
            onClick={() => handleAdd(photo.id)}
            className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/60 transition-colors"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm disabled:opacity-50">
              {adding === photo.id ? "Adding..." : "+ Add"}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
