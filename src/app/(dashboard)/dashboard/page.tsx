import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { CollapsibleCard } from "@/components/dashboard/collapsible-card";
import { QuickEventDialog } from "./quick-actions";

export default async function DashboardPage() {
  await connection();
  const [photoCount, albumCount, eventCount] = await Promise.all([
    prisma.photo.count(),
    prisma.album.count(),
    prisma.event.count(),
  ]);

  const recentPhotos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      thumbnailPath: true,
      createdAt: true,
      album: { select: { title: true } },
    },
  });

  const upcomingEvents = await prisma.event.findMany({
    where: { startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: 5,
    select: { id: true, title: true, startDate: true },
  });

  const stats = [
    { label: "Photos", value: photoCount, href: "/dashboard/photos" },
    { label: "Albums", value: albumCount, href: "/dashboard/photos/albums" },
    { label: "Events", value: eventCount, href: "/dashboard/events" },
  ];

  return (
    <div>
      <SectionHeader
        title="Dashboard"
        subtitle="Manage family content"
      />

      {/* Stats grid */}
      <div className="@container grid grid-cols-2 @sm:grid-cols-3 gap-4 mt-6">
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover padding="md" className="text-center">
              <div className="text-xl @sm:text-2xl font-semibold text-primary">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </Card>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/photos/upload"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            Upload Photos
          </a>
          <Link
            href="/dashboard/photos/albums/new"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            New Album
          </Link>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            New Event
          </Link>
          <QuickEventDialog />
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent photos */}
        <CollapsibleCard title="Recent Photos">
          <div>
            {recentPhotos.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No photos yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your first photo to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {recentPhotos.map((photo) => (
                  <a
                    key={photo.id}
                    href="/dashboard/photos"
                    className="aspect-square rounded-md overflow-hidden bg-background block"
                  >
                    <Image
                      src={`/api/images/${photo.id}?size=thumbnail`}
                      alt={photo.album?.title ?? "Photo"}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                      unoptimized
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </CollapsibleCard>

        {/* Upcoming events */}
        <CollapsibleCard title="Upcoming Events">
          <div>
            {upcomingEvents.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No upcoming events</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create an event to see it here.
                </p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <a
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  className="flex items-center justify-between px-5 py-3 not-last:border-b not-last:border-border/50 hover:bg-background/50 transition-colors"
                >
                  <span className="text-sm text-foreground truncate mr-3">
                    {event.title}
                  </span>
                  <span className="text-xs text-text-dim shrink-0">
                    {new Date(event.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </a>
              ))
            )}
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
