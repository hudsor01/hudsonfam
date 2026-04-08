"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { addMemorialMedia, removeMemorialMedia } from "@/lib/memorial-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddMediaForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(formRef.current!);
      await addMemorialMedia(formData);
      formRef.current?.reset();
      toast.success("Media added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add media";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-muted-foreground mb-1.5">
            URL <span className="text-accent">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Type <span className="text-accent">*</span>
          </label>
          <Select name="type" defaultValue="photo">
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Caption <span className="text-text-dim">(optional)</span>
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            placeholder="Describe this photo or video"
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-muted-foreground mb-1.5">
            Sort Order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={0}
            min={0}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-destructive text-xs bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Media"}
      </button>
    </form>
  );
}

interface MediaDeleteButtonProps {
  mediaId: string;
}

export function MediaDeleteButton({ mediaId }: MediaDeleteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await removeMemorialMedia(mediaId);
      toast.success("Media removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove media");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={loading}
          className="absolute top-2 right-2 size-7 rounded-full bg-background/80 border border-border text-destructive hover:bg-destructive/20 hover:border-destructive/30 transition-colors flex items-center justify-center disabled:opacity-50"
          title="Remove"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this media?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this media item from the memorial page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
