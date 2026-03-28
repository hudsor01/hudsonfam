export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MemberActions } from "./member-actions";
import { InviteForm } from "./invite-form";

export default async function MembersPage() {
  await requireRole(["owner"]);

  const [users, invites] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.inviteToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Members" }]} />
      <SectionHeader
        title="Members"
        subtitle={`${users.length} registered user${users.length !== 1 ? "s" : ""}`}
      />

      {/* Invite Section */}
      <div className="mt-6 mb-8">
        <h2 className="text-xs font-sans font-semibold tracking-[3px] text-accent uppercase mb-4">
          Invite Family Members
        </h2>
        <InviteForm />

        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-text-dim">{invites.length} pending invite{invites.length !== 1 ? "s" : ""}</p>
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-muted-foreground">{invite.email || "Any email"}</span>
                  <span className="text-text-dim ml-3">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="ml-2">{invite.role}</Badge>
                </div>
                <code className="text-text-dim bg-background px-2 py-1 rounded text-[10px] select-all">
                  /signup?token={invite.token}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users List */}
      <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
        Registered Users
      </h2>
      <div className="space-y-2">
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
              className="bg-card border border-border rounded-lg px-5 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground font-medium truncate">
                      {user.name}
                    </span>
                    <Badge variant={roleVariant}>{role}</Badge>
                    {user.banned && (
                      <Badge variant="default" className="bg-red-400/10 text-red-400 border-red-400/25">
                        banned
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    <span className="text-xs text-text-dim">
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
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
