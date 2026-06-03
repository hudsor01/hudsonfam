"use client";

/**
 * nav-link.tsx — STUB (Wave 0 placeholder)
 *
 * This file is a Wave 0 stub created so the test suite can import
 * NavLink and assert its contract. The stub renders a plain link
 * with NO aria-current and NO active styling.
 *
 * Plan 35-02 replaces this file with the real implementation:
 * - usePathname() active detection
 * - aria-current="page" on the active link
 * - text-foreground font-medium active styles
 */

import Link from "next/link";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground transition-colors contrast-more:underline"
    >
      {children}
    </Link>
  );
}
