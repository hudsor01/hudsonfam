import { requireRole } from "@/lib/session";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["owner", "admin", "member"]);
  const userName = session.user.name || session.user.email;
  const userEmail = session.user.email;
  const userRole = (session.user as { role?: string }).role || "member";

  const navLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/posts", label: "Posts" },
    { href: "/dashboard/photos", label: "Photos" },
    { href: "/dashboard/events", label: "Events" },
    { href: "/dashboard/updates", label: "Updates" },
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
