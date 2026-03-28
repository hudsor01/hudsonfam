export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-lg font-bold">
              H
            </div>
            <span className="text-foreground text-lg font-medium tracking-wide">
              THE HUDSONS
            </span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          {children}
        </div>
        <p className="text-center text-xs text-text-dim mt-6">
          Built by{" "}
          <a
            href="https://hudsondigitalsolutions.com"
            target="_blank"
            rel="noopener"
            className="text-accent/70 hover:text-accent transition-colors"
          >
            Hudson Digital Solutions
          </a>
        </p>
      </div>
    </div>
  );
}
