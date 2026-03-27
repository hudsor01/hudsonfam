import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-5">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
          H
        </div>
        <h1 className="text-6xl font-serif text-accent mb-3">404</h1>
        <h2 className="text-xl text-text font-medium mb-2">Page Not Found</h2>
        <p className="text-text-muted text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-5 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/blog"
            className="px-5 py-2.5 bg-surface text-text-muted text-sm rounded-lg border border-border hover:text-text hover:border-text-dim transition-colors"
          >
            Read Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
