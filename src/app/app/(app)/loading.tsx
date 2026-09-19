import { ShellSkeleton } from "@/components/skeletons/shell-skeleton";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <DashboardSkeleton />
    </ShellSkeleton>
  );
}
