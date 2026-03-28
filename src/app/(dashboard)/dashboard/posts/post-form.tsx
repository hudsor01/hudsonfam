"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useZodForm } from "@/lib/form-utils";
import { postFormSchema } from "@/lib/schemas";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      excerpt: initial?.excerpt ?? "",
      tags: initial?.tags.join(", ") ?? "",
      coverImage: initial?.coverImage ?? "",
      status: (initial?.status ?? "DRAFT") as "DRAFT" | "PUBLISHED",
    },
    schema: postFormSchema,
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
      formData.set("excerpt", values.excerpt ?? "");
      formData.set("tags", values.tags ?? "");
      formData.set("coverImage", values.coverImage ?? "");
      formData.set("status", values.status);

      await action(formData);
      toast.success(initial ? "Post updated" : "Post created");
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
          <div>
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
          </div>
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

      <form.Field name="excerpt">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="excerpt">Excerpt</Label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground caret-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
              placeholder="Brief summary of the post..."
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="tags">
        {(field) => (
          <Input
            label="Tags (comma-separated)"
            name="tags"
            placeholder="family, travel, recipes"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      <form.Field name="coverImage">
        {(field) => (
          <Input
            label="Cover Image URL"
            name="coverImage"
            placeholder="/api/images/placeholder/cover"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      <form.Field name="status">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              name="status"
              value={field.state.value}
              onValueChange={(v) =>
                field.handleChange(v as "DRAFT" | "PUBLISHED")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
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
