"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PostFormProps {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    slug: string;
    excerpt: string | null;
    tags: string[];
    status: string;
    coverImage: string | null;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function PostForm({ action, initial }: PostFormProps) {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await action(formData);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Something went wrong";
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
          Excerpt
        </label>
        <textarea
          name="excerpt"
          rows={3}
          defaultValue={initial?.excerpt || ""}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
          placeholder="Brief summary of the post..."
        />
      </div>

      <Input
        label="Tags (comma-separated)"
        name="tags"
        defaultValue={initial?.tags.join(", ")}
        placeholder="family, travel, recipes"
      />

      <Input
        label="Cover Image URL"
        name="coverImage"
        defaultValue={initial?.coverImage || ""}
        placeholder="/api/images/placeholder/cover"
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Status
        </label>
        <select
          name="status"
          defaultValue={initial?.status || "DRAFT"}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {initial ? "Update Post" : "Create Post"}
        </Button>
        <a href="/dashboard/posts">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}
