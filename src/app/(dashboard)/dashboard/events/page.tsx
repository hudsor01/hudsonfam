export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deleteEvent } from "@/lib/dashboard-actions";

export default async function EventsPage() {
  const now = new Date();

  const upcomingEvents = await prisma.event.findMany({
    where: { startDate: { gte: now } },
    orderBy: { startDate: "asc" },
  });

  const pastEvents = await prisma.event.findMany({
    where: { startDate: { lt: now } },
    orderBy: { startDate: "desc" },
    take: 20,
  });

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <p className="text-text-muted text-sm">No upcoming events.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <a
                    href={`/dashboard/events/${event.id}`}
                    className="text-sm text-text hover:text-primary truncate transition-colors"
                  >
                    {event.title}
                  </a>
                  <Badge variant={event.visibility === "FAMILY" ? "accent" : "outline"}>
                    {event.visibility.toLowerCase()}
                  </Badge>
                  {event.allDay && (
                    <Badge variant="outline">all day</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-text-dim">
                    {formatDate(event.startDate)}
                  </span>
                  <a
                    href={`/dashboard/events/${event.id}`}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Edit
                  </a>
                  <form
                    action={async () => {
                      "use server";
                      await deleteEvent(event.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {pastEvents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
            Past Events
          </h2>
          <div className="space-y-2">
            {pastEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-3 opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <a
                    href={`/dashboard/events/${event.id}`}
                    className="text-sm text-text hover:text-primary truncate transition-colors"
                  >
                    {event.title}
                  </a>
                  <Badge variant={event.visibility === "FAMILY" ? "accent" : "outline"}>
                    {event.visibility.toLowerCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-text-dim">
                    {formatDate(event.startDate)}
                  </span>
                  <a
                    href={`/dashboard/events/${event.id}`}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Edit
                  </a>
                  <form
                    action={async () => {
                      "use server";
                      await deleteEvent(event.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
