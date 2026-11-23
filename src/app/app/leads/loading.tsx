import { Card, Skeleton } from "@/components/ui";
import { SkeletonPage, TableSkeleton, TitleSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage className="space-y-4">
      <TitleSkeleton actions={3} />
      <Card className="flex flex-wrap gap-2 p-3">
        <Skeleton className="h-9 w-full sm:w-72" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </Card>
      <TableSkeleton rows={12} cols={7} avatar />
    </SkeletonPage>
  );
}
