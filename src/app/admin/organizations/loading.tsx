import { FilterBarSkeleton, SkeletonPage, TableSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <TitleSkeleton />
      <FilterBarSkeleton fields={1} />
      <TableSkeleton rows={10} cols={7} />
    </SkeletonPage>
  );
}
