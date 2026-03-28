import { requireRole } from "@/lib/session";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["owner", "admin", "member"]);
  const userName = session.user.name || session.user.email;
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
    <div className="min-h-screen flex">
      <aside className="w-56 bg-card border-r border-border p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-sm font-medium">Dashboard</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-background"
              >
                {link.label}
              </a>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-text-dim truncate">{userName}</p>
          <a href="/" className="text-xs text-text-dim hover:text-muted-foreground transition-colors">
            Home
          </a>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
