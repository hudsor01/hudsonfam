import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="border-b border-border px-5 sm:px-7 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-foreground text-[15px] font-medium tracking-wide">
            THE HUDSONS
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm tracking-wide">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          <Link href="/photos" className="text-muted-foreground hover:text-foreground transition-colors">Photos</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-lg">
          <div className="relative mb-8">
            <span className="text-[120px] sm:text-[160px] font-serif text-border/50 leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center">
                <span className="text-3xl font-serif text-accent">H</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-foreground mb-3 text-balance">
            Page Not Found
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-sm mx-auto text-pretty">
            This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              Back to Home
            </Link>
            <Link
              href="/blog"
              className="w-full sm:w-auto px-6 py-3 bg-card text-muted-foreground text-sm font-medium rounded-lg border border-border hover:text-foreground hover:border-primary/30 transition-colors text-center"
            >
              Read the Blog
            </Link>
            <Link
              href="/photos"
              className="w-full sm:w-auto px-6 py-3 bg-card text-muted-foreground text-sm font-medium rounded-lg border border-border hover:text-foreground hover:border-primary/30 transition-colors text-center"
            >
              View Photos
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-5 sm:px-7 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-text-dim">
        <span>&copy; {new Date().getFullYear()} The Hudson Family</span>
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
      </footer>
    </div>
  );
}
