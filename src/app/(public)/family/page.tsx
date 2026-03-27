export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SectionHeader } from "@/components/ui/section-header";
import UpdateCard from "@/components/public/update-card";
import LoadMoreUpdates from "./load-more-updates";

export const metadata = {
  title: "Family Updates | The Hudson Family",
  description: "Latest updates from the Hudson family",
};

const PAGE_SIZE = 10;

export default async function FamilyPage() {
  // Check if user is authenticated (to show FAMILY updates)
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isAuthenticated = !!session;

  // Build visibility filter
  const visibilityFilter = isAuthenticated
    ? {} // Authenticated users see all updates
    : { visibility: "PUBLIC" as const };

  // Fetch first page of updates
  const updates = await prisma.familyUpdate.findMany({
    where: visibilityFilter,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1, // +1 to check if there are more
  });

  const hasMore = updates.length > PAGE_SIZE;
  const displayUpdates = hasMore ? updates.slice(0, PAGE_SIZE) : updates;

  // Get poster names -- look up user table
  // Better Auth user table uses "user" as the table name
  const posterIds = [...new Set(displayUpdates.map((u) => u.postedById))];
  const users = posterIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: posterIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(
    users.map((u) => [u.id, u.name || u.email || "Family Member"])
  );

  return (
    <div className="max-w-2xl mx-auto px-7 py-12">
      <SectionHeader
        title="Family Updates"
        subtitle="What we've been up to lately"
      />

      {displayUpdates.length === 0 ? (
        <p className="text-text-muted text-sm mt-8">
          No updates yet. Check back soon.
        </p>
      ) : (
        <div className="space-y-6 mt-8">
          {displayUpdates.map((update) => (
            <UpdateCard
              key={update.id}
              content={update.content}
              images={update.images}
              postedByName={userMap.get(update.postedById) || "Family Member"}
              createdAt={update.createdAt}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <LoadMoreUpdates
          initialCursor={displayUpdates[displayUpdates.length - 1].id}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}
