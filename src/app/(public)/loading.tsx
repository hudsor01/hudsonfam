import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
      {/* Title skeleton */}
      <Skeleton className="h-8 w-2/3 mb-4" />
      {/* Subtitle skeleton */}
      <Skeleton className="h-4 w-1/2 mb-10" />

      {/* Content skeletons */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-3/4 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
