import { ChartSkeleton, ListSkeleton, SkeletonPage, StatGridSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <TitleSkeleton />
      <StatGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListSkeleton rows={5} />
        <ListSkeleton rows={5} />
      </div>
    </SkeletonPage>
  );
}
