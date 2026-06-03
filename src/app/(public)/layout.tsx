import { Suspense } from "react";
import Link from "next/link";
import { MobileNav } from "@/components/public/mobile-nav";
import { NavLink } from "@/components/public/nav-link";
import { UserNav } from "@/components/public/user-nav";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { CopyrightYear } from "@/components/public/copyright-year";
import { MenuProvider } from "@/components/public/menu-provider";
import { MenuIndicator } from "@/components/public/menu-indicator";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/photos", label: "Photos" },
  { href: "/events", label: "Events" },
  { href: "/richard-hudson-sr", label: "In Memory" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border ps-5 pe-5 sm:ps-7 sm:pe-7 py-5 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-[15px] font-medium tracking-wide">
            THE HUDSONS
          </span>
        </Link>

        {/* Desktop nav — NavLink calls usePathname() (dynamic). Suspense keeps the
            static shell from blocking on dynamic routes (e.g. /photos/[album]). */}
        <div className="hidden md:flex items-center gap-6 text-sm tracking-wide">
          <Suspense fallback={
            navLinks.map((link) => (
              <span key={link.href} className="text-muted-foreground transition-colors contrast-more:underline">
                {link.label}
              </span>
            ))
          }>
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </Suspense>
          <ThemeToggle />
          <UserNav />
        </div>

        {/* Mobile nav — uses usePathname(), which is dynamic for param routes
            (e.g. /photos/[album]). Suspense keeps it from blocking the layout's
            static shell under Cache Components. */}
        <Suspense fallback={<div className="md:hidden size-9" />}>
          <MobileNav links={navLinks} />
        </Suspense>
      </nav>

      <MenuProvider>
        <main className="flex-1">{children}</main>
        <MenuIndicator />
      </MenuProvider>

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
    </div>
  );
}
