"use client";

import { Calendar } from "@/components/ui/calendar";

interface EventsMiniCalendarProps {
  /** Dates that have events, serialized as ISO strings from the server. */
  eventDates: string[];
}

export function EventsMiniCalendar({ eventDates }: EventsMiniCalendarProps) {
  const highlighted = eventDates.map((d) => new Date(d));

  return (
    <Calendar
      mode="single"
      modifiers={{ event: highlighted }}
      modifiersClassNames={{
        event:
          "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-accent",
      }}
      className="rounded-xl border border-border bg-card"
    />
  );
}
