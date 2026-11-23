import { ListSkeleton, PanelSkeleton, SkeletonPage, StatGridSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <TitleSkeleton back />
      <StatGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ListSkeleton rows={4} />
        </div>
        <PanelSkeleton lines={6} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton lines={5} />
        <PanelSkeleton lines={5} />
      </div>
    </SkeletonPage>
  );
}
