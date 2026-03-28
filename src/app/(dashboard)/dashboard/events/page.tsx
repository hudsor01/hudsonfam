export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { deleteEvent } from "@/lib/dashboard-actions";
import { EventsDataTable } from "./events-data-table";

export default async function EventsPage() {
  const now = new Date();

  const [upcomingEvents, pastEvents] = await Promise.all([
    prisma.event.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: "asc" },
    }),
    prisma.event.findMany({
      where: { startDate: { lt: now } },
      orderBy: { startDate: "desc" },
      take: 20,
    }),
  ]);

  function toRows(events: typeof upcomingEvents) {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      visibility: event.visibility,
      allDay: event.allDay,
      startDate: event.startDate.toISOString(),
      deleteAction: (async () => {
        "use server";
        await deleteEvent(event.id);
      }) as () => Promise<void>,
    }));
  }

  return (
    <div>
      <SectionHeader
        title="Events"
        subtitle="Manage family events"
        action={{ text: "+ New Event", href: "/dashboard/events/new" }}
      />

      {/* Upcoming */}
      <div className="mt-6">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
          Upcoming
        </h2>
        {upcomingEvents.length === 0 ? (
          <Card padding="md">
            <p className="text-muted-foreground text-sm">No upcoming events.</p>
          </Card>
        ) : (
          <EventsDataTable data={toRows(upcomingEvents)} />
        )}
      </div>

      {/* Past */}
      {pastEvents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
            Past Events
          </h2>
          <div className="opacity-60">
            <EventsDataTable data={toRows(pastEvents)} />
          </div>
        </div>
      )}
    </div>
  );
}
