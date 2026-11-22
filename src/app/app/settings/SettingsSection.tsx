import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standard settings row: title and description on the left, the controls in a
 * card on the right. Stacks on small screens.
 */
export function SettingsSection({
  title,
  description,
  children,
  footer,
  flush,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Optional action bar at the bottom of the card. */
  footer?: ReactNode;
  /** Remove the card's inner padding (for tables and lists). */
  flush?: boolean;
}) {
  return (
    <section className="grid gap-4 border-b border-line pb-8 last:border-0 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <div className="mt-1 text-sm leading-relaxed text-muted">{description}</div>}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className={cn(!flush && "p-5")}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
      </div>
    </section>
  );
}
