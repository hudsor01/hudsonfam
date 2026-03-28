export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MemorialAdminPage() {
  await requireRole(["owner"]);

  const [totalMemories, approvedMemories, pendingMemories, totalMedia] =
    await Promise.all([
      prisma.memory.count(),
      prisma.memory.count({ where: { approved: true } }),
      prisma.memory.count({ where: { approved: false } }),
      prisma.memorialMedia.count(),
    ]);

  const stats = [
    { label: "Total Memories", value: totalMemories, href: "/dashboard/memorial/memories" },
    { label: "Approved", value: approvedMemories, href: "/dashboard/memorial/memories" },
    { label: "Pending Review", value: pendingMemories, href: "/dashboard/memorial/memories", highlight: pendingMemories > 0 },
    { label: "Media Items", value: totalMedia, href: "/dashboard/memorial/media" },
  ];

  const recentPending = await prisma.memory.findMany({
    where: { approved: false },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div>
      <SectionHeader
        title="Memorial"
        subtitle="Manage the Richard Hudson Sr. memorial page"
      />

      {/* Pending alert */}
      {pendingMemories > 0 && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg className="size-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">
                {pendingMemories} memor{pendingMemories === 1 ? "y" : "ies"} awaiting review
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                New memories require approval before appearing on the memorial page.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/memorial/memories"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-medium shrink-0"
          >
            Review now
          </a>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card hover padding="md" className={`text-center ${stat.highlight ? "border-amber-500/30" : ""}`}>
              <div className={`text-2xl font-semibold ${stat.highlight ? "text-amber-400" : "text-primary"}`}>
                {stat.value}
                {stat.highlight && (
                  <Badge variant="accent" className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">
                    new
                  </Badge>
                )}
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
          Manage
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/memorial/memories"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Moderate Memories
          </a>
          <a
            href="/dashboard/memorial/media"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            Manage Media
          </a>
          <a
            href="/dashboard/memorial/content"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            Edit Page Content
          </a>
          <a
            href="/richard-hudson-sr"
            target="_blank"
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
          >
            View Memorial Page
          </a>
        </div>
      </div>

      {/* Recent pending */}
      {recentPending.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-amber-400 uppercase mb-4">
            Recent Pending Memories
          </h2>
          <div className="space-y-3">
            {recentPending.map((memory) => (
              <Card key={memory.id} padding="md" className="border-amber-500/15">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-foreground font-medium">
                        {memory.firstName} {memory.lastName}
                      </span>
                      <Badge variant="accent" className="text-[10px]">
                        {memory.relationship}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {memory.content}
                    </p>
                    <p className="text-xs text-text-dim mt-1">
                      {new Date(memory.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
