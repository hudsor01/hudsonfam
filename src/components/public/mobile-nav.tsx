"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

interface NavLink {
  href: string;
  label: string;
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground p-2 -mr-2"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-card">
          <SheetHeader>
            <SheetTitle className="text-left font-serif text-accent">
              The Hudson Family
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`
                    px-3 py-2.5 rounded-md text-sm transition-colors
                    ${isActive ? "text-foreground bg-background" : "text-muted-foreground hover:text-foreground hover:bg-background"}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border mt-4 pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm text-accent hover:bg-background transition-colors block"
              >
                Sign In
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
