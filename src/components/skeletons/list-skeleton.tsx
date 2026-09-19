import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="glass rounded-[22px] p-4">
      <div className="divide-y divide-frost/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-11 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
