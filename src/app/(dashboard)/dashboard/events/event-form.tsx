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
import { Switch } from "@/components/ui/switch";
import { useZodForm } from "@/lib/form-utils";
import { eventFormSchema } from "@/lib/schemas";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      location: initial?.location ?? "",
      startDate: initial?.startDate ?? "",
      endDate: initial?.endDate ?? "",
      allDay: initial?.allDay ?? false,
      visibility: (initial?.visibility ?? "PUBLIC") as "PUBLIC" | "FAMILY",
    },
    schema: eventFormSchema,
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
      formData.set("description", values.description ?? "");
      formData.set("location", values.location ?? "");
      formData.set("startDate", values.startDate);
      formData.set("endDate", values.endDate ?? "");
      if (values.allDay) formData.set("allDay", "on");
      formData.set("visibility", values.visibility);

      await action(formData);
      toast.success(initial ? "Event updated" : "Event created");
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
            placeholder="Family BBQ, Birthday Party, etc."
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
              placeholder="Event details..."
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="location">
        {(field) => (
          <Input
            label="Location"
            name="location"
            placeholder="Where is this happening?"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.join(", ") || undefined}
          />
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="startDate">
          {(field) => (
            <Input
              label="Start Date"
              name="startDate"
              type="datetime-local"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(", ") || undefined}
            />
          )}
        </form.Field>

        <form.Field name="endDate">
          {(field) => (
            <Input
              label="End Date"
              name="endDate"
              type="datetime-local"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={field.state.meta.errors.join(", ") || undefined}
            />
          )}
        </form.Field>
      </div>

      <div className="flex items-center gap-6">
        <form.Field name="allDay">
          {(field) => (
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
              />
              <span className="text-sm text-muted-foreground">
                All day event
              </span>
            </label>
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
                <SelectTrigger className="w-[140px]">
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
