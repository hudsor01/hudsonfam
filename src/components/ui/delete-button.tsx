"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteButtonProps {
  action: () => Promise<void>;
  title?: string;
  description?: string;
  label?: string;
  successMessage?: string;
  className?: string;
}

export function DeleteButton({
  action,
  title = "Are you sure?",
  description = "This action cannot be undone. This will permanently delete this item.",
  label = "Delete",
  successMessage = "Deleted successfully",
  className = "text-xs text-destructive hover:text-destructive/80 transition-colors",
}: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" className={className} disabled={loading}>
          {label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
