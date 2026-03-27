import { requireRole } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner"]);

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-text text-[15px] font-medium">Dashboard</span>
        </div>
        <div className="flex gap-4 text-sm text-text-muted">
          <a href="/">Site</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
