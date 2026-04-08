"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useZodForm } from "@/lib/form-utils";
import { eventFormSchema } from "@/lib/schemas";

/**
 * Parse a datetime-local string ("2026-03-28T14:00") into a Date, or undefined.
 */
function parseDatetimeLocal(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Extract the time portion ("HH:mm") from a datetime-local string,
 * defaulting to "12:00" if absent.
 */
function extractTime(value: string): string {
  if (!value) return "12:00";
  const parts = value.split("T");
  return parts[1] ?? "12:00";
}

/**
 * Combine a Date (for the date portion) with a time string ("HH:mm")
 * into a datetime-local string ("2026-03-28T14:00").
 */
function combineDateAndTime(date: Date, time: string): string {
  const dateStr = format(date, "yyyy-MM-dd");
  return `${dateStr}T${time}`;
}

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
        <div className="bg-destructive/10 border border-destructive/25 rounded-lg px-4 py-3 text-sm text-destructive">
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
          {(field) => {
            const dateValue = parseDatetimeLocal(field.state.value);
            const timeValue = extractTime(field.state.value);
            return (
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateValue
                        ? format(dateValue, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateValue}
                      onSelect={(date) => {
                        if (date) {
                          field.handleChange(
                            combineDateAndTime(date, timeValue)
                          );
                        }
                      }}
                      defaultMonth={dateValue}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={timeValue}
                  onChange={(e) => {
                    const d = dateValue ?? new Date();
                    field.handleChange(
                      combineDateAndTime(d, e.target.value || "12:00")
                    );
                  }}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="endDate">
          {(field) => {
            const dateValue = parseDatetimeLocal(field.state.value);
            const timeValue = extractTime(field.state.value);
            return (
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {dateValue
                        ? format(dateValue, "MMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateValue}
                      onSelect={(date) => {
                        if (date) {
                          field.handleChange(
                            combineDateAndTime(date, timeValue)
                          );
                        } else {
                          field.handleChange("");
                        }
                      }}
                      defaultMonth={dateValue}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={dateValue ? timeValue : ""}
                  onChange={(e) => {
                    const d = dateValue ?? new Date();
                    field.handleChange(
                      combineDateAndTime(d, e.target.value || "12:00")
                    );
                  }}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}
              </div>
            );
          }}
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
