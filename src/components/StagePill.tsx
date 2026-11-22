import { cn } from "@/lib/cn";
import type { StageColor } from "@/lib/stage-colors";

export function StagePill({ name, color, className }: { name: string; color: StageColor; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        color.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", color.dot)} />
      {name}
    </span>
  );
}
