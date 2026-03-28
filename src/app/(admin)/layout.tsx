import { requireRole } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner"]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-[15px] font-medium">Admin</span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <a href="/">Site</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
