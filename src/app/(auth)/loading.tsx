import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div>
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-10 w-full mb-4 rounded-lg" />
      <Skeleton className="h-10 w-full mb-3 rounded-lg" />
      <Skeleton className="h-10 w-full mb-3 rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}
