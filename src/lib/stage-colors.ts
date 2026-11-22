/**
 * Colour per pipeline stage, used consistently on the board, tables, badges
 * and dashboard. Class names are written out in full so Tailwind keeps them.
 */
export type StageColor = { dot: string; bar: string; pill: string; fill: string };

const OPEN: StageColor[] = [
  {
    dot: "bg-sky-500",
    bar: "border-t-sky-500",
    fill: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300",
  },
  {
    dot: "bg-violet-500",
    bar: "border-t-violet-500",
    fill: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300",
  },
  {
    dot: "bg-amber-500",
    bar: "border-t-amber-500",
    fill: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    dot: "bg-orange-500",
    bar: "border-t-orange-500",
    fill: "bg-orange-500",
    pill: "bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/10 dark:text-orange-300",
  },
  {
    dot: "bg-pink-500",
    bar: "border-t-pink-500",
    fill: "bg-pink-500",
    pill: "bg-pink-50 text-pink-700 ring-pink-600/15 dark:bg-pink-500/10 dark:text-pink-300",
  },
  {
    dot: "bg-teal-500",
    bar: "border-t-teal-500",
    fill: "bg-teal-500",
    pill: "bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300",
  },
];

const WON: StageColor = {
  dot: "bg-emerald-500",
  bar: "border-t-emerald-500",
  fill: "bg-emerald-500",
  pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const LOST: StageColor = {
  dot: "bg-rose-500",
  bar: "border-t-rose-500",
  fill: "bg-rose-400",
  pill: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300",
};

type StageLike = { id: string; kind: "open" | "won" | "lost" };

/** Builds a stage id -> colour map. Open stages cycle through the palette in order. */
export function stageColors(stages: StageLike[]): Map<string, StageColor> {
  const map = new Map<string, StageColor>();
  let openIndex = 0;
  for (const s of stages) {
    if (s.kind === "won") map.set(s.id, WON);
    else if (s.kind === "lost") map.set(s.id, LOST);
    else map.set(s.id, OPEN[openIndex++ % OPEN.length]!);
  }
  return map;
}

export const FALLBACK_COLOR = OPEN[0]!;
