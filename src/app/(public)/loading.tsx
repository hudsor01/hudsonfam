export default function PublicLoading() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14 animate-pulse">
      {/* Title skeleton */}
      <div className="h-8 bg-surface rounded-lg w-2/3 mb-4" />
      {/* Subtitle skeleton */}
      <div className="h-4 bg-surface rounded w-1/2 mb-10" />

      {/* Content skeletons */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <div className="h-5 bg-bg rounded w-3/4 mb-3" />
            <div className="h-3 bg-bg rounded w-full mb-2" />
            <div className="h-3 bg-bg rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
