"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-muted hover:text-text p-2 -mr-2"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
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
        )}
      </button>

      {open && (
        <div className="absolute top-[65px] left-0 right-0 bg-surface border-b border-border z-50">
          <div className="flex flex-col px-5 py-4 gap-1">
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
                    ${isActive ? "text-text bg-bg" : "text-text-muted hover:text-text hover:bg-bg"}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border mt-2 pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm text-accent hover:bg-bg transition-colors block"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
