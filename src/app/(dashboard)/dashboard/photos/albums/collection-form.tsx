"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useZodForm } from "@/lib/form-utils";
import { collectionFormSchema } from "@/lib/schemas";

interface CollectionFormProps {
  action: (input: { title: string; description?: string }) => Promise<void>;
  initial?: {
    title: string;
    description: string | null;
  };
}

export function CollectionForm({ action, initial }: CollectionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
    },
    schema: collectionFormSchema,
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
      await action({
        title: values.title,
        description: values.description || undefined,
      });
      toast.success(initial ? "Collection updated" : "Collection created");
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
        <div className="bg-destructive/10 border border-destructive/25 rounded-lg px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form.Field name="title">
        {(field) => (
          <Input
            label="Title"
            name="title"
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
              placeholder="What is this collection about?"
            />
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
          {initial ? "Update Collection" : "Create Collection"}
        </Button>
        <Link href="/dashboard/photos/albums">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
