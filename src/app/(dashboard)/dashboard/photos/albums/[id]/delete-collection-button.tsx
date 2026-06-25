"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteCollection } from "@/lib/collection-actions";

interface DeleteCollectionButtonProps {
  collectionId: string;
  collectionTitle: string;
}

export function DeleteCollectionButton({
  collectionId,
  collectionTitle,
}: DeleteCollectionButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteCollection(collectionId);
      toast.success("Collection deleted");
      router.push("/dashboard/photos/albums");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="gap-2"
      >
        <Trash2 className="size-4" />
        Delete Collection
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{collectionTitle}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this collection and remove all photo memberships. Photos themselves are not deleted. This action cannot be undone.
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
