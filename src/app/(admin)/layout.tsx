import { requireRole } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["owner", "admin", "member"]);
  const userName = session.user.name || session.user.email;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-surface border-r border-border p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-text text-sm font-medium">Admin</span>
        </div>
        <a href="/admin" className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-bg">
          Dashboard
        </a>
        <a href="/admin/posts" className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-bg">
          Posts
        </a>
        <a href="/admin/photos" className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-bg">
          Photos
        </a>
        <a href="/admin/events" className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-bg">
          Events
        </a>
        <a href="/admin/updates" className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-md hover:bg-bg">
          Updates
        </a>
        <div className="mt-auto pt-4 border-t border-border">
          <p className="text-xs text-text-dim truncate">{userName}</p>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
