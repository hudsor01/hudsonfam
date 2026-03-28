export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "./invite-form";
import { MembersDataTable } from "./members-data-table";

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

  const memberRows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "member",
    banned: user.banned || false,
    createdAt: user.createdAt.toISOString(),
  }));

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
      <MembersDataTable data={memberRows} />
    </div>
  );
}
