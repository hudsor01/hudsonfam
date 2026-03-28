import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { EventForm } from "../event-form";
import { createEvent } from "@/lib/dashboard-actions";

export default function NewEventPage() {
  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Events", href: "/dashboard/events" }, { label: "New Event" }]} />
      <SectionHeader title="New Event" subtitle="Schedule a family event" />
      <div className="mt-6">
        <EventForm action={createEvent} />
      </div>
    </div>
  );
}
