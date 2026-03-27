import { SectionHeader } from "@/components/ui/section-header";
import { EventForm } from "../event-form";
import { createEvent } from "@/lib/dashboard-actions";

export default function NewEventPage() {
  return (
    <div>
      <SectionHeader title="New Event" subtitle="Schedule a family event" />
      <div className="mt-6">
        <EventForm action={createEvent} />
      </div>
    </div>
  );
}
