"use client";

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14 text-center">
      <h2 className="text-xl font-serif text-foreground mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {error.digest ? `Error ${error.digest}` : "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
