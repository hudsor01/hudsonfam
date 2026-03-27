import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <Skeleton className="h-7 w-48 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />

      {/* Grid of card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-5 h-32"
          >
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-8 w-1/3 mb-3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
