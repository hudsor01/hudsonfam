"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createUpdate } from "@/lib/dashboard-actions";

export function UpdateForm() {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createUpdate(formData);
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

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          What's happening?
        </label>
        <textarea
          name="content"
          required
          rows={4}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y"
          placeholder="Share a quick update with the family..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Visibility
        </label>
        <select
          name="visibility"
          defaultValue="PUBLIC"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="PUBLIC">Public</option>
          <option value="FAMILY">Family Only</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending}>
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
