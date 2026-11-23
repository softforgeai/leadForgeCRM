import { PanelSkeleton, SkeletonPage, StatGridSkeleton, TableSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <TitleSkeleton actions={1} />
      <StatGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <PanelSkeleton lines={6} className="lg:col-span-2" />
        <PanelSkeleton lines={6} />
      </div>
      <TableSkeleton rows={5} cols={4} />
    </SkeletonPage>
  );
}
