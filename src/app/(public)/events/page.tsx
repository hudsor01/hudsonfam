export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SectionHeader } from "@/components/ui/section-header";
import EventCard from "@/components/public/event-card";

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
        <h2 className="text-text-muted text-xs tracking-[3px] uppercase mb-4">
          Upcoming
        </h2>

        {upcomingEvents.length === 0 ? (
          <p className="text-text-muted text-sm">
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

      {/* Past events */}
      {pastEvents.length > 0 && (
        <div className="mt-12">
          <details>
            <summary className="text-text-muted text-xs tracking-[3px] uppercase cursor-pointer hover:text-text transition-colors select-none">
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
