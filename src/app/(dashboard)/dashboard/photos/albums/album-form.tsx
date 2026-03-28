"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useZodForm } from "@/lib/form-utils";
import { albumFormSchema } from "@/lib/schemas";

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

export function AlbumForm({
  action,
  initial,
  showCoverPhoto = false,
}: AlbumFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      description: initial?.description ?? "",
      date: initial?.date ?? "",
      coverPhotoId: initial?.coverPhotoId ?? "",
    },
    schema: albumFormSchema,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setServerError(null);

    form.handleSubmit();

    if (!form.state.isValid) return;

    setIsPending(true);
    try {
      const values = form.state.values;
      const formData = new FormData();
      formData.set("title", values.title);
      formData.set("slug", values.slug);
      formData.set("description", values.description ?? "");
      formData.set("date", values.date ?? "");
      if (values.coverPhotoId) formData.set("coverPhotoId", values.coverPhotoId);

      await action(formData);
      toast.success(initial ? "Album updated" : "Album created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {serverError && (
        <div className="bg-red-400/10 border border-red-400/25 rounded-lg px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <form.Field name="title">
        {(field) => (
          <Input
            label="Title"
            name="title"
            value={field.state.value}
            onChange={(e) => {
              field.handleChange(e.target.value);
              if (!initial) {
                form.setFieldValue("slug", slugify(e.target.value));
              }
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      <form.Field name="slug">
        {(field) => (
          <Input
            label="Slug"
            name="slug"
            placeholder="url-friendly-slug"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground caret-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
              placeholder="What is this album about?"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <Input
            label="Date"
            name="date"
            type="date"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      {showCoverPhoto && (
        <form.Field name="coverPhotoId">
          {(field) => (
            <Input
              label="Cover Photo ID"
              name="coverPhotoId"
              placeholder="Photo ID for album cover"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(", ") || undefined}
            />
          )}
        </form.Field>
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
