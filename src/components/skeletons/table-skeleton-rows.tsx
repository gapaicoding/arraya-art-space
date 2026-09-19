import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Row-level skeleton for use inside an existing <Table>/<TableBody> during a
 * client-side refetch (date change, search, pagination) — as opposed to
 * TableSkeleton, which renders a whole standalone card for route-level
 * (loading.tsx) transitions.
 */
export function TableSkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-3.5 w-full max-w-32" style={{ opacity: 1 - c * 0.06 }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
