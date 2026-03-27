export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-7 bg-surface rounded-lg w-48 mb-2" />
      <div className="h-4 bg-surface rounded w-64 mb-8" />

      {/* Grid of card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-5 h-32"
          >
            <div className="h-4 bg-bg rounded w-1/2 mb-3" />
            <div className="h-8 bg-bg rounded w-1/3 mb-3" />
            <div className="h-3 bg-bg rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
