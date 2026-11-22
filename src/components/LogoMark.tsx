import { cn } from "@/lib/cn";

/** The LeadForge mark: a rising line inside an "L". Matches src/app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" className={cn("size-7 shrink-0", className)}>
      <defs>
        <linearGradient id="lf-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#lf-mark-gradient)" />
      <path d="M19 15v34h27" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M29 36l8-8 9 9"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
