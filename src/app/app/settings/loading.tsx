import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-4 md:grid-cols-[15rem_1fr] md:gap-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-44" />
        </div>
      ))}
    </div>
  );
}
