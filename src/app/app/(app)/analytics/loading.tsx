import { ShellSkeleton } from "@/components/skeletons/shell-skeleton";
import { AnalyticsSkeleton } from "@/components/skeletons/analytics-skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <AnalyticsSkeleton />
    </ShellSkeleton>
  );
}
