import { Suspense } from "react";
import { connection } from "next/server";
import { requireRole } from "@/lib/session";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The authed shell does an uncached session lookup (requireRole), which under
  // Cache Components must sit inside a <Suspense> boundary so it doesn't block
  // the route's static shell. Auth still runs server-side before any protected
  // content is rendered (it's awaited inside DashboardShell).
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await requireRole(["owner", "admin", "member"]);
  const userName = session.user.name || session.user.email;
  const userEmail = session.user.email;
  const userRole = (session.user as { role?: string }).role || "member";

  const navLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/photos", label: "Photos" },
  ];

  if (userRole === "owner") {
    navLinks.push({ href: "/dashboard/members", label: "Members" });
    navLinks.push({ href: "/dashboard/memorial", label: "Memorial" });
  }

  return (
    <SidebarProvider>
      <AppSidebar navLinks={navLinks} userName={userName} userEmail={userEmail} userRole={userRole} />
      <SidebarInset>
        <header className="flex items-center gap-2 p-4 border-b border-border">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
