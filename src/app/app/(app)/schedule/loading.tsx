import { ShellSkeleton } from "@/components/skeletons/shell-skeleton";
import { ScheduleSkeleton } from "@/components/skeletons/schedule-skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <ScheduleSkeleton />
    </ShellSkeleton>
  );
}
