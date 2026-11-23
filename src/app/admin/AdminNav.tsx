"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Inbox, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { LinkPending } from "@/components/LinkPending";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/support", label: "Support inbox", icon: Inbox },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav({ awaitingReply }: { awaitingReply?: number }) {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-sidebar-active font-medium text-sidebar-fg"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg",
              )}
            >
              <Icon aria-hidden className={cn("size-4", active && "text-accent-text")} />
              <span className="flex-1">{label}</span>
              <LinkPending className="text-sidebar-muted" />
              {href === "/admin/support" && awaitingReply ? (
                <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-fg">
                  {awaitingReply > 99 ? "99+" : awaitingReply}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
