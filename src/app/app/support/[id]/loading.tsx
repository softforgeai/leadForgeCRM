import { PanelSkeleton, SkeletonPage, ThreadSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="mx-auto max-w-3xl">
      <TitleSkeleton back />
      <ThreadSkeleton />
      <PanelSkeleton lines={3} />
    </SkeletonPage>
  );
}
