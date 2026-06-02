"use client";

import Link from "next/link";
import { useMenu } from "@/components/public/menu-provider";

export function MenuIndicator() {
  const { count } = useMenu();

  if (count === 0) return null;

  return (
    <Link
      href="/my-menu"
      className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 min-h-11 text-sm font-medium text-foreground shadow-elevated hover:border-primary/40 hover:text-primary transition-colors"
      aria-label={`My Menu — ${count} recipe${count === 1 ? "" : "s"} saved`}
    >
      <span aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </span>
      My Menu ({count})
    </Link>
  );
}
