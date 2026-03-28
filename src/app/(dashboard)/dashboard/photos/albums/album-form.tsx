"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AlbumFormProps {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    slug: string;
    description: string | null;
    date: string | null;
    coverPhotoId: string | null;
  };
  showCoverPhoto?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AlbumForm({ action, initial, showCoverPhoto = false }: AlbumFormProps) {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await action(formData);
        toast.success(initial ? "Album updated" : "Album created");
        return null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        toast.error(msg);
        return msg;
      }
    },
    null
  );

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {error && (
        <div className="bg-red-400/10 border border-red-400/25 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Input
        label="Title"
        name="title"
        required
        defaultValue={initial?.title}
        onChange={(e) => {
          if (!initial) {
            const slugInput = e.currentTarget.form?.querySelector(
              'input[name="slug"]'
            ) as HTMLInputElement | null;
            if (slugInput) {
              slugInput.value = slugify(e.currentTarget.value);
            }
          }
        }}
      />

      <Input
        label="Slug"
        name="slug"
        required
        defaultValue={initial?.slug}
        placeholder="url-friendly-slug"
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description || ""}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
          placeholder="What is this album about?"
        />
      </div>

      <Input
        label="Date"
        name="date"
        type="date"
        defaultValue={initial?.date || ""}
      />

      {showCoverPhoto && (
        <Input
          label="Cover Photo ID"
          name="coverPhotoId"
          defaultValue={initial?.coverPhotoId || ""}
          placeholder="Photo ID for album cover"
        />
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {initial ? "Update Album" : "Create Album"}
        </Button>
        <a href="/dashboard/photos/albums">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}
