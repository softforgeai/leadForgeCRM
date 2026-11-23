import { Card, Skeleton } from "@/components/ui";
import { SkeletonPage, TitleSkeleton } from "@/components/skeletons";

const CARDS = [3, 2, 4, 1, 2];

export default function Loading() {
  return (
    <div data-fullbleed className="h-full">
      <SkeletonPage className="flex h-full flex-col gap-5">
        <TitleSkeleton actions={2} />
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
          {CARDS.map((n, col) => (
            <div key={col} className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-surface-2/60 p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
              {Array.from({ length: n }, (_, i) => (
                <Card key={i} className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="size-6 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </SkeletonPage>
    </div>
  );
}
