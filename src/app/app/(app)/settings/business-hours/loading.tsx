import { ShellSkeleton } from "@/components/skeletons/shell-skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

export default function Loading() {
  return (
    <ShellSkeleton>
      <ListSkeleton rows={7} />
    </ShellSkeleton>
  );
}
