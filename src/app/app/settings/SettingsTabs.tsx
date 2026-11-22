"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileInput, KanbanSquare, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/app/settings", label: "General", icon: Building2 },
  { href: "/app/settings/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/app/settings/team", label: "Team", icon: Users },
  { href: "/app/settings/lead-capture", label: "Lead capture", icon: FileInput },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="scroll-thin mt-5 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-accent text-accent-text" : "border-transparent text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
