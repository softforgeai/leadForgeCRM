import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

/** Small building blocks shared by the admin pages. */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
        {hint && <dd className="mt-0.5 text-xs text-subtle">{hint}</dd>}
      </div>
    </Card>
  );
}

export const TONES = {
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
} as const;

/**
 * Single-series weekly bar chart. One hue, so no legend (the title names the
 * series); each bar has a hover tooltip, and a visually hidden table carries
 * the same numbers for screen readers.
 */
export function WeeklyBars({ title, data }: { title: string; data: { weekStart: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((t, d) => t + d.value, 0);
  const label = (iso: string) => formatDate(`${iso}T00:00:00Z`, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted tabular-nums">{total} in 12 weeks</p>
      </div>
      <div aria-hidden className="mt-5 flex h-36 items-end gap-0.5 border-b border-line">
        {data.map((d) => (
          <div key={d.weekStart} className="group relative flex h-full flex-1 items-end justify-center px-px">
            <div
              className="w-full max-w-7 rounded-t bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: d.value === 0 ? 0 : `${Math.max(3, (d.value / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap text-fg shadow-md group-hover:block">
              Week of {label(d.weekStart)}: <span className="font-semibold tabular-nums">{d.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-subtle">
        <span>{data[0] ? label(data[0].weekStart) : ""}</span>
        <span>This week</span>
      </div>
      <table className="sr-only">
        <caption>{title}, by week</caption>
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.weekStart}>
              <td>{label(d.weekStart)}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
