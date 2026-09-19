import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  columns = 4,
  rows = 8,
  withToolbar = true,
}: {
  columns?: number;
  rows?: number;
  withToolbar?: boolean;
}) {
  return (
    <div className="glass flex flex-col gap-4 rounded-[22px] p-5">
      {withToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-frost/60">
        <div className="flex gap-4 border-b border-frost/60 bg-frost/30 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-frost/40 px-4 py-3.5 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" style={{ opacity: 1 - c * 0.08 }} />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
