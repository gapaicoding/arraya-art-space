import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "./table-skeleton";

export function ScheduleSkeleton() {
  return (
    <>
      <div className="glass rounded-[22px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <TableSkeleton columns={6} rows={6} withToolbar={false} />
    </>
  );
}
