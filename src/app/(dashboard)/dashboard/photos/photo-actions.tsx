"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, ExternalLink, Trash2, FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addPhotoToCollection,
  removePhotoFromCollection,
} from "@/lib/collection-actions";

interface Collection {
  id: string;
  title: string;
  kind: string;
}

interface PhotoActionsProps {
  photoId: string;
  collections: Collection[];
  memberCollectionIds: string[];
  deleteAction: () => Promise<void>;
}

export function PhotoActions({
  photoId,
  collections,
  memberCollectionIds,
  deleteAction,
}: PhotoActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteAction();
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  async function handleCollectionToggle(collectionId: string, isMember: boolean) {
    try {
      if (isMember) {
        await removePhotoFromCollection(collectionId, photoId);
        toast.success("Removed from collection");
      } else {
        await addPhotoToCollection(collectionId, photoId);
        toast.success("Added to collection");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update collection");
    }
  }

  // Surface collections first, then alphabetical within each group
  const surfaceCollections = collections.filter((c) => c.kind === "surface");
  const albumCollections = collections.filter((c) => c.kind !== "surface");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-1.5 rounded-md bg-background/80 text-text-dim hover:text-foreground hover:bg-background transition-colors"
            aria-label="Photo actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(`/api/images/${photoId}?size=original`, "_blank")}>
            <ExternalLink className="size-4" />
            View Full Size
          </DropdownMenuItem>
          {collections.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderPlus className="size-4" />
                Add to collection
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {surfaceCollections.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={memberCollectionIds.includes(c.id)}
                    onCheckedChange={() =>
                      handleCollectionToggle(c.id, memberCollectionIds.includes(c.id))
                    }
                  >
                    {c.title}{" "}
                    <span className="text-xs text-muted-foreground">(Memorial)</span>
                  </DropdownMenuCheckboxItem>
                ))}
                {surfaceCollections.length > 0 && albumCollections.length > 0 && (
                  <DropdownMenuSeparator />
                )}
                {albumCollections.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={memberCollectionIds.includes(c.id)}
                    onCheckedChange={() =>
                      handleCollectionToggle(c.id, memberCollectionIds.includes(c.id))
                    }
                  >
                    {c.title}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this photo. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
