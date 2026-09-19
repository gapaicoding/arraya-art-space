import { Skeleton } from "@/components/ui/skeleton";

function ListCardSkeleton() {
  return (
    <div className="glass rounded-[22px] p-5">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="glass rounded-[22px] p-5">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-3.5 w-80" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-[22px] p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </>
  );
}
