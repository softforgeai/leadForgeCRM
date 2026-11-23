import { FilterBarSkeleton, SkeletonPage, TableSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <TitleSkeleton />
      <FilterBarSkeleton fields={4} />
      <TableSkeleton rows={10} cols={4} avatar />
    </SkeletonPage>
  );
}
