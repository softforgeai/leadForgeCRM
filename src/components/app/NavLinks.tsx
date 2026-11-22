"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, FileUp, KanbanSquare, LayoutDashboard, List, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/today", label: "Today", icon: CalendarCheck },
  { href: "/app/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/app/leads", label: "Leads", icon: List },
  { href: "/app/import", label: "Import", icon: FileUp },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function NavLinks({ dueCount }: { dueCount?: number }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1">{label}</span>
              {href === "/app/today" && dueCount ? (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">
                  {dueCount > 99 ? "99+" : dueCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
