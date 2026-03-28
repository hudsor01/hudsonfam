"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

export function UserNav() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className="text-muted-foreground text-sm w-16" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-accent hover:text-accent/80 transition-colors contrast-more:underline"
      >
        Sign In
      </Link>
    );
  }

  const userName = session.user.name || session.user.email;
  const userInitial = userName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <div className="size-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
            {userInitial}
          </div>
          <span className="text-sm hidden lg:inline">{userName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <div className="px-4 py-3">
          <p className="text-sm font-medium text-popover-foreground truncate">
            {userName}
          </p>
          {session.user.email && (
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
          )}
        </div>
        <Separator />
        <div className="p-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </div>
        <Separator />
        <div className="p-1">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
