import { ListSkeleton, PanelSkeleton, SkeletonPage, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-4xl space-y-6">
      <TitleSkeleton actions={1} />
      <PanelSkeleton lines={2} />
      <ListSkeleton rows={5} />
    </SkeletonPage>
  );
}
