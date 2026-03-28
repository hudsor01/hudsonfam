export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const [postCount, publishedPostCount, photoCount, albumCount, eventCount, updateCount] =
    await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.photo.count(),
      prisma.album.count(),
      prisma.event.count(),
      prisma.familyUpdate.count(),
    ]);

  const recentPosts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  const upcomingEvents = await prisma.event.findMany({
    where: { startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: 5,
    select: { id: true, title: true, startDate: true },
  });

  const stats = [
    { label: "Posts", value: postCount, published: publishedPostCount, href: "/dashboard/posts" },
    { label: "Photos", value: photoCount, href: "/dashboard/photos" },
    { label: "Albums", value: albumCount, href: "/dashboard/photos/albums" },
    { label: "Events", value: eventCount, href: "/dashboard/events" },
    { label: "Updates", value: updateCount, href: "/dashboard/updates" },
  ];

  return (
    <div>
      <SectionHeader
        title="Dashboard"
        subtitle="Manage family content"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover padding="md" className="text-center">
              <div className="text-2xl font-semibold text-primary">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
              {"published" in stat && (
                <div className="text-xs text-text-dim mt-0.5">
                  {stat.published} published
                </div>
              )}
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
            href="/dashboard/posts/new"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            New Post
          </a>
          <a
            href="/dashboard/photos/upload"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            Upload Photos
          </a>
          <a
            href="/dashboard/photos/albums/new"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            New Album
          </a>
          <a
            href="/dashboard/events/new"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            New Event
          </a>
          <a
            href="/dashboard/updates/new"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            New Update
          </a>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent posts */}
        <Card padding="none">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Recent Posts
            </h3>
          </div>
          <div>
            {recentPosts.length === 0 ? (
              <div className="px-5 py-4 text-sm text-muted-foreground">
                No posts yet.
              </div>
            ) : (
              recentPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/dashboard/posts/${post.id}`}
                  className="flex items-center justify-between px-5 py-3 not-last:border-b not-last:border-border/50 hover:bg-background/50 transition-colors"
                >
                  <span className="text-sm text-foreground truncate mr-3">
                    {post.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={post.status === "PUBLISHED" ? "primary" : "outline"}>
                      {post.status.toLowerCase()}
                    </Badge>
                  </div>
                </a>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card padding="none">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Upcoming Events
            </h3>
          </div>
          <div>
            {upcomingEvents.length === 0 ? (
              <div className="px-5 py-4 text-sm text-muted-foreground">
                No upcoming events.
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
        </Card>
      </div>
    </div>
  );
}
