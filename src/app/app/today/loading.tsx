import { ListSkeleton, SkeletonPage, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-3xl space-y-6">
      <TitleSkeleton />
      <ListSkeleton rows={6} />
    </SkeletonPage>
  );
}
