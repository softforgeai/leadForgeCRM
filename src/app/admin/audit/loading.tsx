import { SkeletonPage, TableSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <TitleSkeleton />
      <TableSkeleton rows={3} cols={3} />
      <TableSkeleton rows={10} cols={5} />
    </SkeletonPage>
  );
}
