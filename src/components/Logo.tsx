import { cn } from "@/lib/cn";
import { LogoMark } from "./LogoMark";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-fg", className)}>
      <LogoMark />
      LeadForge
    </span>
  );
}
