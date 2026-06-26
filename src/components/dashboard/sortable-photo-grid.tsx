"use client";

import { useState } from "react";
import Image from "next/image";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  reorderCollectionPhoto,
  setPhotoLayout,
  removePhotoFromCollection,
} from "@/lib/collection-actions";

type PhotoItem = {
  photoId: string;
  caption: string | null;
  layout: string;
};

interface SortablePhotoGridProps {
  collectionId: string;
  items: PhotoItem[];
}

const LAYOUT_OPTIONS = ["auto", "wide", "tall", "feature"] as const;

export function SortablePhotoGrid({
  collectionId,
  items: initialItems,
}: SortablePhotoGridProps) {
  const [items, setItems] = useState<PhotoItem[]>(initialItems);

  async function handleReorder(newItems: PhotoItem[]) {
    setItems(newItems);
    try {
      await reorderCollectionPhoto(
        collectionId,
        newItems.map((i) => i.photoId),
      );
      toast.success("Order saved");
    } catch {
      setItems(items);
      toast.error("Failed to save order");
    }
  }

  async function handleLayoutChange(photoId: string, layout: string) {
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.photoId === photoId ? { ...i, layout } : i)),
    );
    try {
      await setPhotoLayout(collectionId, photoId, layout);
    } catch {
      setItems(prev);
      toast.error("Failed to update layout");
    }
  }

  async function handleRemove(photoId: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.photoId !== photoId));
    try {
      await removePhotoFromCollection(collectionId, photoId);
      toast.success("Photo removed");
    } catch {
      setItems(prev);
      toast.error("Failed to remove photo");
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No photos in this collection yet
      </p>
    );
  }

  return (
    <Sortable
      value={items}
      onValueChange={handleReorder}
      getItemValue={(item) => item.photoId}
      orientation="mixed"
    >
      <SortableContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <SortableItem
            key={item.photoId}
            value={item.photoId}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card"
          >
            {/* Drag handle */}
            <SortableItemHandle className="absolute left-1 top-1 z-10 flex size-6 items-center justify-center rounded bg-background/70 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
              <GripVertical className="size-3.5 text-muted-foreground" />
              <span className="sr-only">Drag to reorder</span>
            </SortableItemHandle>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 z-10 size-6 rounded bg-background/70 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => handleRemove(item.photoId)}
              aria-label="Remove photo"
            >
              <X className="size-3.5" />
            </Button>

            {/* Photo thumbnail */}
            <div className="aspect-square w-full overflow-hidden">
              <Image
                src={`/api/images/${item.photoId}?size=thumbnail`}
                alt={item.caption ?? "Photo"}
                width={400}
                height={400}
                className="h-full w-full object-cover"
                draggable={false}
                unoptimized
              />
            </div>

            {/* Layout selector */}
            <div className="p-1.5">
              <Select
                value={item.layout}
                onValueChange={(v) => handleLayoutChange(item.photoId, v)}
              >
                <SelectTrigger className="h-7 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs">
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SortableItem>
        ))}
      </SortableContent>

      <SortableOverlay>
        {({ value }) => {
          const item = items.find((i) => i.photoId === value);
          return (
            <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              <div className="aspect-square w-full overflow-hidden">
                <Image
                  src={`/api/images/${String(value)}?size=thumbnail`}
                  alt={item?.caption ?? "Photo"}
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                  draggable={false}
                  unoptimized
                />
              </div>
            </div>
          );
        }}
      </SortableOverlay>
    </Sortable>
  );
}
