export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border px-7 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-bold">
            H
          </div>
          <span className="text-text text-[15px] font-medium tracking-wide">
            THE HUDSONS
          </span>
        </div>
        <div className="flex gap-6 text-sm text-text-muted tracking-wide">
          <a href="/" className="text-text">Home</a>
          <a href="/blog">Blog</a>
          <a href="/photos">Photos</a>
          <a href="/events">Events</a>
          <a href="/family">Family</a>
          <a href="/login" className="text-accent">Sign In</a>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-7 py-4 flex justify-between text-xs text-text-dim">
        <span>&copy; 2026 The Hudson Family</span>
        <span>Dallas, TX</span>
      </footer>
    </div>
  );
}
