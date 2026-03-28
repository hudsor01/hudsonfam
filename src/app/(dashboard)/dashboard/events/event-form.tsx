"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      // Inject the allDay value since Switch doesn't submit like a checkbox
      if (allDay) {
        formData.set("allDay", "on");
      } else {
        formData.delete("allDay");
      }
      try {
        await action(formData);
        toast.success(initial ? "Event updated" : "Event created");
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
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-y field-sizing-content"
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
          <Switch
            checked={allDay}
            onCheckedChange={setAllDay}
          />
          <span className="text-sm text-text-muted">All day event</span>
        </label>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">
            Visibility
          </label>
          <Select name="visibility" defaultValue={initial?.visibility || "PUBLIC"}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="FAMILY">Family Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
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
