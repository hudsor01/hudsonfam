export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { MemberActions } from "./member-actions";

export default async function MembersPage() {
  await requireRole(["owner"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      banReason: true,
      createdAt: true,
      emailVerified: true,
    },
  });

  return (
    <div>
      <SectionHeader
        title="Members"
        subtitle={`${users.length} registered user${users.length !== 1 ? "s" : ""}`}
      />

      <div className="mt-6 space-y-2">
        {users.map((user) => {
          const role = user.role || "member";
          const roleVariant =
            role === "owner"
              ? "accent"
              : role === "admin"
                ? "primary"
                : "outline";

          return (
            <div
              key={user.id}
              className="bg-surface border border-border rounded-lg px-5 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text font-medium truncate">
                      {user.name}
                    </span>
                    <Badge variant={roleVariant}>{role}</Badge>
                    {user.banned && (
                      <Badge variant="default" className="bg-red-400/10 text-red-400 border-red-400/25">
                        banned
                      </Badge>
                    )}
                    {!user.emailVerified && (
                      <Badge variant="outline">unverified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted">{user.email}</span>
                    <span className="text-xs text-text-dim">
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {user.banned && user.banReason && (
                    <p className="text-xs text-red-400/70 mt-1">
                      Reason: {user.banReason}
                    </p>
                  )}
                </div>
                <MemberActions
                  userId={user.id}
                  currentRole={role}
                  isBanned={user.banned || false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
