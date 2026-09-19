import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the area + hourly-slot-badge layout in the Ketersediaan tab. */
export function AvailabilitySkeleton({ areas = 2 }: { areas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: areas }).map((_, i) => (
        <div key={i} className="glass rounded-[22px] p-4">
          <Skeleton className="mb-3 h-4 w-40" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-12 w-20 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
