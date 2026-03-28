"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createUpdate } from "@/lib/dashboard-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useZodForm } from "@/lib/form-utils";
import { updateFormSchema } from "@/lib/schemas";

export function UpdateForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    defaultValues: {
      content: "",
      visibility: "PUBLIC" as "PUBLIC" | "FAMILY",
    },
    schema: updateFormSchema,
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
      formData.set("content", values.content);
      formData.set("visibility", values.visibility);

      await createUpdate(formData);
      toast.success("Update posted");
      form.reset();
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

      <form.Field name="content">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="content">What&apos;s happening?</Label>
            <textarea
              id="content"
              name="content"
              rows={4}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground caret-primary placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
              placeholder="Share a quick update with the family..."
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="visibility">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select
              name="visibility"
              value={field.state.value}
              onValueChange={(v) =>
                field.handleChange(v as "PUBLIC" | "FAMILY")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="FAMILY">Family Only</SelectItem>
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
          Post Update
        </Button>
        <a href="/dashboard/updates">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}
