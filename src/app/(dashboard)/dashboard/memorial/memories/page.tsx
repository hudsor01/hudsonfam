export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { MemoryActions } from "./memory-actions";

export default async function MemoriesModPage() {
  await requireRole(["owner"]);

  const [pending, approved] = await Promise.all([
    prisma.memory.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.memory.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <SectionHeader
        title="Memories"
        subtitle="Review and moderate submitted memories"
        action={{ text: "Back to Memorial", href: "/dashboard/memorial" }}
      />

      {/* Pending Review Section */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-amber-400 uppercase">
            Pending Review
          </h2>
          {pending.length > 0 && (
            <Badge variant="accent" className="bg-amber-500/15 text-amber-400 border-amber-500/25">
              {pending.length}
            </Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-text-muted">No memories pending review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((memory) => (
              <div
                key={memory.id}
                className="bg-surface border border-amber-500/15 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-text font-medium">
                        {memory.firstName} {memory.lastName}
                      </span>
                      <Badge variant="accent" className="text-[10px]">
                        {memory.relationship}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-3 text-xs text-text-dim">
                      <span>{memory.email}</span>
                      {memory.phone && <span>{memory.phone}</span>}
                      <span>
                        {new Date(memory.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <blockquote className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap bg-bg/50 rounded-lg px-4 py-3 border-l-2 border-amber-500/30">
                      {memory.content}
                    </blockquote>
                  </div>
                  <MemoryActions memoryId={memory.id} approved={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Section */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
            Approved
          </h2>
          <Badge variant="primary">{approved.length}</Badge>
        </div>

        {approved.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-8 text-center">
            <p className="text-sm text-text-muted">No approved memories yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approved.map((memory) => (
              <div
                key={memory.id}
                className="bg-surface border border-border rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-text font-medium">
                        {memory.firstName} {memory.lastName}
                      </span>
                      <Badge variant="accent" className="text-[10px]">
                        {memory.relationship}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-3 text-xs text-text-dim">
                      <span>{memory.email}</span>
                      {memory.phone && <span>{memory.phone}</span>}
                      <span>
                        {new Date(memory.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                      {memory.content}
                    </p>
                  </div>
                  <MemoryActions memoryId={memory.id} approved={true} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
