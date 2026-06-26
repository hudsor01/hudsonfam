import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { connection } from "next/server";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";

export default async function MemorialAdminPage() {
  await connection();
  await requireRole(["owner"]);

  // The memorial page is driven entirely by the "memorial" photo collection
  // (its first photo is the hero). Obituary text is static in the page itself.
  const memorial = await prisma.collection.findUnique({
    where: { slug: "memorial" },
    include: { _count: { select: { photos: true } } },
  });
  const photoCount = memorial?._count.photos ?? 0;

  return (
    <div>
      <SectionHeader
        title="Memorial"
        subtitle="Manage the Richard Hudson Sr. memorial page"
      />

      {/* Stat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <a href="/dashboard/memorial/media">
          <Card hover padding="md" className="text-center">
            <div className="text-2xl font-semibold text-primary">{photoCount}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              Memorial Photos
            </div>
          </Card>
        </a>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
          Manage
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/memorial/media"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Manage Photos
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
    </div>
  );
}
