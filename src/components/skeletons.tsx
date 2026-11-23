import type { ReactNode } from "react";
import { Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Building blocks for loading.tsx files. Each page's skeleton mirrors its real
 * layout, so content appears in place instead of jumping around.
 */

export function SkeletonPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("space-y-5", className)}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

export function TitleSkeleton({ actions = 0, back = false }: { actions?: number; back?: boolean }) {
  return (
    <div className="space-y-3">
      {back && <Skeleton className="h-4 w-28" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: actions }, (_, i) => (
              <Skeleton key={i} className="h-9 w-28" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex items-start gap-4 p-5">
          <Skeleton className="size-10 shrink-0" />
          <div className="w-full space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FilterBarSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Skeleton className="h-10 w-full sm:max-w-sm" />
      {Array.from({ length: fields }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full sm:w-44" />
      ))}
    </div>
  );
}

// Varied widths so rows don't look like a barcode.
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/12", "w-7/12", "w-1/3"];

export function TableSkeleton({
  rows = 8,
  cols = 5,
  avatar = false,
  className,
}: {
  rows?: number;
  cols?: number;
  avatar?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex gap-4 border-b border-line px-4 py-3">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className={cn("h-3", c === 0 ? "w-32 flex-[2]" : "w-16 flex-1")} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex flex-[2] items-center gap-3">
              {avatar && <Skeleton className="size-8 shrink-0 rounded-full" />}
              <div className="w-full space-y-1.5">
                <Skeleton className={cn("h-4", WIDTHS[r % WIDTHS.length])} />
                <Skeleton className={cn("h-3", WIDTHS[(r + 3) % WIDTHS.length])} />
              </div>
            </div>
            {Array.from({ length: cols - 1 }, (_, c) => (
              <div key={c} className="hidden flex-1 sm:block">
                <Skeleton className={cn("h-4", WIDTHS[(r + c + 1) % WIDTHS.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ListSkeleton({ rows = 6, badges = 1 }: { rows?: number; badges?: number }) {
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={cn("h-4", WIDTHS[r % WIDTHS.length])} />
            <Skeleton className={cn("h-3", WIDTHS[(r + 2) % WIDTHS.length])} />
          </div>
          {Array.from({ length: badges }, (_, i) => (
            <Skeleton key={i} className="h-5 w-20 shrink-0 rounded-md" />
          ))}
        </div>
      ))}
    </Card>
  );
}

/** A card with a heading and a few lines, for detail-page panels. */
export function PanelSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="border-b border-line px-4 py-3">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-4", WIDTHS[i % WIDTHS.length])} />
        ))}
      </div>
    </Card>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  const heights = ["h-1/3", "h-1/2", "h-2/5", "h-3/5", "h-1/2", "h-4/5", "h-2/3", "h-3/4", "h-1/2", "h-5/6", "h-2/3", "h-full"];
  return (
    <Card className={cn("p-4", className)}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 flex h-40 items-end gap-2">
        {heights.map((h, i) => (
          <Skeleton key={i} className={cn("flex-1 rounded-t-md rounded-b-none", h)} />
        ))}
      </div>
    </Card>
  );
}

/** A chat-style thread, for ticket pages. */
export function ThreadSkeleton({ messages = 3 }: { messages?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: messages }, (_, i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 1 && "flex-row-reverse")}>
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Card className="w-full max-w-xl space-y-2 p-4">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className={cn("h-4", WIDTHS[i % WIDTHS.length])} />
          </Card>
        </div>
      ))}
    </div>
  );
}

/** A titled form card, for create pages. */
export function FormSkeleton({ fields = 5, className }: { fields?: number; className?: string }) {
  return (
    <SkeletonPage className={cn("mx-auto max-w-3xl", className)}>
      <TitleSkeleton back />
      <Card className="space-y-5 p-5 sm:p-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </Card>
    </SkeletonPage>
  );
}
