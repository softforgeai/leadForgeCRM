import { PanelSkeleton, SkeletonPage, ThreadSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <TitleSkeleton back />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <ThreadSkeleton />
          <PanelSkeleton lines={3} />
        </div>
        <div className="space-y-4">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={3} />
        </div>
      </div>
    </SkeletonPage>
  );
}
