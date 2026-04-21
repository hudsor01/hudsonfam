import Link from "next/link";
import { headers } from "next/headers";
import { requireRole } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner"]);

  // Per proxy.ts: CSP nonce set on request headers. Read here so any future
  // <Script> tag in the admin shell can consume it. Latent for Phase 20 (no
  // admin <Script> tags exist yet) — retrofit-ready per AI-SAFETY-05.
  const nonce = (await headers()).get("x-nonce");
  void nonce;

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
          <Link href="/admin/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Site</Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
