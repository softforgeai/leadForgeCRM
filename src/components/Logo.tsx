import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-fg", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6">
        <rect width="24" height="24" rx="6" className="fill-accent" />
        <path d="M7 6v12h10" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 13l3-3 3 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      LeadForge
    </span>
  );
}
