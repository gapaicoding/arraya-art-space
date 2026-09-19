import { ShellSkeleton } from "@/components/skeletons/shell-skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <TableSkeleton columns={4} rows={8} />
    </ShellSkeleton>
  );
}
