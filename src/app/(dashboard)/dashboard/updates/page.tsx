export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deleteUpdate } from "@/lib/dashboard-actions";
import { DeleteButton } from "@/components/ui/delete-button";

export default async function UpdatesPage() {
  const updates = await prisma.familyUpdate.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <SectionHeader
        title="Family Updates"
        subtitle="Quick status posts and announcements"
        action={{ text: "+ New Update", href: "/dashboard/updates/new" }}
      />

      {updates.length === 0 ? (
        <Card padding="lg" className="text-center mt-6">
          <p className="text-text-muted text-sm">No updates yet.</p>
          <a
            href="/dashboard/updates/new"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Post your first update
          </a>
        </Card>
      ) : (
        <div className="space-y-3 mt-6">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-surface border border-border rounded-lg px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text whitespace-pre-wrap">
                    {update.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-text-dim">
                      {new Date(update.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <Badge
                      variant={
                        update.visibility === "FAMILY" ? "accent" : "outline"
                      }
                    >
                      {update.visibility.toLowerCase()}
                    </Badge>
                  </div>
                </div>
                <DeleteButton
                  action={async () => {
                    "use server";
                    await deleteUpdate(update.id);
                  }}
                  title="Delete update?"
                  description="This will permanently delete this family update. This action cannot be undone."
                  successMessage="Update deleted"
                  className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
