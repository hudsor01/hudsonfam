import Link from "next/link";
import { MobileNav } from "@/components/public/mobile-nav";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/photos", label: "Photos" },
  { href: "/events", label: "Events" },
  { href: "/family", label: "Family" },
  { href: "/richard-hudson-sr", label: "In Memory" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border px-5 sm:px-7 py-5 flex items-center justify-between relative">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-[15px] font-medium tracking-wide">
            THE HUDSONS
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm tracking-wide">
          {navLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              {link.label}
            </NavLink>
          ))}
          <Link
            href="/login"
            className="text-accent hover:text-accent/80 transition-colors contrast-more:underline"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile nav */}
        <MobileNav links={navLinks} />
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="px-5 sm:px-7 py-6 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground font-medium">
              The Hudson Family
            </span>
            <span className="text-xs text-text-dim">Dallas, TX</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
            <Link href="/blog" className="hover:text-muted-foreground transition-colors">
              Blog
            </Link>
            <Link href="/photos" className="hover:text-muted-foreground transition-colors">
              Photos
            </Link>
            <Link href="/events" className="hover:text-muted-foreground transition-colors">
              Events
            </Link>
            <Link href="/family" className="hover:text-muted-foreground transition-colors">
              Family
            </Link>
          </div>
        </div>
        <div className="border-t border-border px-5 sm:px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-text-dim">
          <span>&copy; {new Date().getFullYear()} The Hudson Family. All rights reserved.</span>
          <span>
            Built by{" "}
            <a
              href="https://hudsondigitalsolutions.com"
              target="_blank"
              rel="noopener"
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

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground transition-colors contrast-more:underline"
    >
      {children}
    </Link>
  );
}
