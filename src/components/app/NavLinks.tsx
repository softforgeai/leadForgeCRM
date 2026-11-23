"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, FileUp, KanbanSquare, LayoutDashboard, LifeBuoy, Settings, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const groups = [
  {
    label: "Sales",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/app/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/app/leads", label: "Contacts", icon: Users },
      { href: "/app/today", label: "Tasks", icon: CalendarCheck },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/app/import", label: "Import", icon: FileUp },
      { href: "/app/settings", label: "Settings", icon: Settings },
      { href: "/app/support", label: "Help & support", icon: LifeBuoy },
    ],
  },
];

export function NavLinks({ dueCount }: { dueCount?: number }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-active font-medium text-sidebar-fg"
                        : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg",
                    )}
                  >
                    {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                    <Icon aria-hidden className={cn("size-4", active ? "text-accent-text dark:text-accent-text" : "")} />
                    <span className="flex-1">{label}</span>
                    {href === "/app/today" && dueCount ? (
                      <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-fg">
                        {dueCount > 99 ? "99+" : dueCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
