import { FilterBarSkeleton, ListSkeleton, SkeletonPage, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <TitleSkeleton />
      <FilterBarSkeleton fields={2} />
      <ListSkeleton rows={8} badges={2} />
    </SkeletonPage>
  );
}
