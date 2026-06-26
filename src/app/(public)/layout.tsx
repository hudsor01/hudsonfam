import { Suspense } from "react";
import Link from "next/link";
import { MobileNav } from "@/components/public/mobile-nav";
import { NavLink } from "@/components/public/nav-link";
import { UserNav } from "@/components/public/user-nav";
import { CopyrightYear } from "@/components/public/copyright-year";
import { MenuProvider } from "@/components/public/menu-provider";
import { MenuIndicator } from "@/components/public/menu-indicator";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/photos", label: "Photos" },
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
            THE HUDSON FAMILY
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
          <UserNav />
        </div>

        {/* Mobile nav — uses usePathname(), which is dynamic for param routes
            (e.g. /photos/[album]). Suspense keeps it from blocking the layout's
            static shell under Cache Components. */}
        <Suspense
          fallback={
            <div className="md:hidden flex items-center gap-1" aria-hidden>
              {/* Theme-toggle silhouette — keeps the control affordance visible
                  during the suspended frame without re-implementing the toggle. */}
              <div className="size-9" />
              {/* Static hamburger glyph mirroring MobileNav's SheetTrigger so the
                  menu affordance does not vanish while usePathname resolves. */}
              <div className="p-2 -mr-2 text-muted-foreground">
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
              </div>
            </div>
          }
        >
          <MobileNav links={navLinks} />
        </Suspense>
      </nav>

      <MenuProvider>
        <main className="flex-1">{children}</main>
        <MenuIndicator />
      </MenuProvider>

      <footer className="border-t border-border px-5 sm:px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-text-dim">
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
      </footer>
    </div>
  );
}
