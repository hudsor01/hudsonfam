"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EventFormProps {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    description: string | null;
    location: string | null;
    startDate: string;
    endDate: string | null;
    allDay: boolean;
    visibility: string;
  };
}

export function EventForm({ action, initial }: EventFormProps) {
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
        placeholder="Family BBQ, Birthday Party, etc."
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description || ""}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y"
          placeholder="Event details..."
        />
      </div>

      <Input
        label="Location"
        name="location"
        defaultValue={initial?.location || ""}
        placeholder="Where is this happening?"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          name="startDate"
          type="datetime-local"
          required
          defaultValue={initial?.startDate}
        />
        <Input
          label="End Date"
          name="endDate"
          type="datetime-local"
          defaultValue={initial?.endDate || ""}
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="allDay"
            defaultChecked={initial?.allDay}
            className="rounded border-border text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-text-muted">All day event</span>
        </label>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">
            Visibility
          </label>
          <select
            name="visibility"
            defaultValue={initial?.visibility || "PUBLIC"}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          >
            <option value="PUBLIC">Public</option>
            <option value="FAMILY">Family Only</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {initial ? "Update Event" : "Create Event"}
        </Button>
        <a href="/dashboard/events">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}
