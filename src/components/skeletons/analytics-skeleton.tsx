import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <>
      <div className="glass rounded-[22px] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass rounded-[22px] p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-10" />
          </div>
        ))}
      </div>

      <div className="glass rounded-[22px] p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3.5 w-64" />
        <Skeleton className="mt-4 h-40 w-full rounded-lg" />
      </div>

      <div className="glass rounded-[22px] p-4">
        <Skeleton className="h-4 w-40" />
        <div className="mt-3 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
