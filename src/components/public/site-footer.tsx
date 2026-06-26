"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopyrightYear } from "@/components/public/copyright-year";

// Routes that provide their own standalone ending and should NOT render the
// site-wide footer. The memorial page ends at its Revelation scripture band.
const HIDE_FOOTER_ON = ["/richard-hudson-sr"];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDE_FOOTER_ON.includes(pathname)) return null;

  return (
    <footer className="border-t border-border">
      <div className="px-5 sm:px-7 py-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground font-medium">
            The Hudson Family
          </span>
          <span className="text-xs text-text-dim">Dallas, TX</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
          <Link href="/recipes" className="hover:text-muted-foreground transition-colors">
            Recipes
          </Link>
          <Link href="/photos" className="hover:text-muted-foreground transition-colors">
            Photos
          </Link>
          <Link href="/events" className="hover:text-muted-foreground transition-colors">
            Events
          </Link>
          <Link href="/richard-hudson-sr" className="hover:text-muted-foreground transition-colors">
            In Memory
          </Link>
        </div>
      </div>
      <div className="border-t border-border px-5 sm:px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-text-dim">
        <span>&copy; <CopyrightYear /> The Hudson Family. All rights reserved.</span>
        <span>
          Built by{" "}
          <a
            href="https://hudsondigitalsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/70 hover:text-accent transition-colors"
          >
            Hudson Digital Solutions
          </a>
        </span>
      </div>
    </footer>
  );
}
