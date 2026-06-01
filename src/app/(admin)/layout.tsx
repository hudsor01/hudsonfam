import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireRole } from "@/lib/session";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The owner-only auth check (requireRole) is an uncached session lookup;
  // under Cache Components it must sit inside a <Suspense> boundary so it
  // doesn't block the route's static shell. Auth runs server-side before any
  // protected content renders (awaited inside AdminShell).
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  await connection();
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
          <Link href="/admin" className="hover:text-foreground transition-colors">Overview</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Site</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
