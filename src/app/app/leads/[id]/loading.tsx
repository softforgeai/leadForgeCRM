import { Card, Skeleton } from "@/components/ui";
import { PanelSkeleton, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </Card>
          <PanelSkeleton lines={5} />
        </div>
        <Card className="space-y-4 p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </Card>
        <PanelSkeleton lines={4} className="h-fit lg:col-span-2 xl:col-span-1" />
      </div>
    </SkeletonPage>
  );
}
