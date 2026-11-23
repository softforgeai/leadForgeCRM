import { Skeleton } from "@/components/ui";
import { ListSkeleton, PanelSkeleton, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-6">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ListSkeleton rows={3} />
        </div>
        <PanelSkeleton lines={6} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListSkeleton rows={3} />
        <ListSkeleton rows={3} />
      </div>
    </SkeletonPage>
  );
}
