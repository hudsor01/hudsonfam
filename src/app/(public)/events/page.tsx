export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SectionHeader } from "@/components/ui/section-header";
import EventCard from "@/components/public/event-card";
import { EventsMiniCalendar } from "@/components/public/events-mini-calendar";

export const metadata = {
  title: "Events | The Hudson Family",
  description: "Upcoming family events and gatherings",
};

export default async function EventsPage() {
  const now = new Date();

  // Check if user is authenticated (to show FAMILY events)
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isAuthenticated = !!session;

  // Build visibility filter
  const visibilityFilter = isAuthenticated
    ? {} // Authenticated users see all events
    : { visibility: "PUBLIC" as const };

  // Fetch upcoming events (startDate >= now)
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startDate: { gte: now },
      ...visibilityFilter,
    },
    orderBy: { startDate: "asc" },
  });

  // Fetch past events (startDate < now), last 12
  const pastEvents = await prisma.event.findMany({
    where: {
      startDate: { lt: now },
      ...visibilityFilter,
    },
    orderBy: { startDate: "desc" },
    take: 12,
  });

  return (
    <div className="max-w-3xl mx-auto px-7 py-12 motion-safe:animate-fade-in-up">
      <SectionHeader
        title="Events"
        subtitle="What's happening with the Hudsons"
      />

      {/* Upcoming events */}
      <div className="mt-8">
        <h2 className="text-muted-foreground text-xs tracking-[3px] uppercase mb-4">
          Upcoming
        </h2>

        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No upcoming events scheduled.
          </p>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                description={event.description}
                location={event.location}
                startDate={event.startDate}
                endDate={event.endDate}
                allDay={event.allDay}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mini-calendar with event dates highlighted */}
      {upcomingEvents.length > 0 && (
        <div className="mt-10">
          <h2 className="text-muted-foreground text-xs tracking-[3px] uppercase mb-4">
            Calendar
          </h2>
          <EventsMiniCalendar
            eventDates={upcomingEvents.map((e) => e.startDate.toISOString())}
          />
        </div>
      )}

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div className="mt-12">
          <details className="group">
            <summary className="text-muted-foreground text-xs tracking-[3px] uppercase cursor-pointer hover:text-foreground open:text-foreground transition-colors select-none list-none [&::-webkit-details-marker]:hidden flex items-center gap-2">
              <svg className="size-3.5 transition-transform group-open:rotate-90 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              Past Events ({pastEvents.length})
            </summary>

            <div className="space-y-4 mt-4">
              {pastEvents.map((event) => (
                <div key={event.id} className="opacity-60">
                  <EventCard
                    title={event.title}
                    description={event.description}
                    location={event.location}
                    startDate={event.startDate}
                    endDate={event.endDate}
                    allDay={event.allDay}
                  />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
