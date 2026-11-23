import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, Badge, ButtonLink } from "@/components/ui";
import type { WorkspaceContext } from "@/lib/auth";
import { MobileNav } from "./MobileNav";
import { ROLE_LABEL, SidebarBody } from "./Sidebar";

export function TopBar({
  ctx,
  dueCount,
  isPlatformAdmin,
}: {
  ctx: WorkspaceContext;
  dueCount: number;
  isPlatformAdmin?: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
      <MobileNav>
        <SidebarBody ctx={ctx} dueCount={dueCount} isPlatformAdmin={isPlatformAdmin} />
      </MobileNav>

      <form action="/app/leads" method="get" role="search" className="relative min-w-0 flex-1 sm:max-w-md">
        <label htmlFor="global-search" className="sr-only">
          Search contacts
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Search contacts, companies, emails…"
          className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-3 pl-9 text-sm placeholder:text-subtle focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 focus:outline-none"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {ctx.workspace.is_demo && (
          <span className="hidden md:block">
            <Badge tone="warning">Demo</Badge>
          </span>
        )}
        <span className="hidden sm:block">
          <ButtonLink href="/app/leads/new" size="sm">
            <Plus aria-hidden className="size-4" /> Add lead
          </ButtonLink>
        </span>
        <Link
          href="/app/today"
          aria-label={dueCount ? `Tasks, ${dueCount} due` : "Tasks"}
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
        >
          <Bell aria-hidden className="size-4" />
          {dueCount > 0 && (
            <span className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {dueCount > 9 ? "9+" : dueCount}
            </span>
          )}
        </Link>
        <ThemeToggle />
        <div className="ml-1 hidden items-center gap-2 border-l border-line pl-3 sm:flex">
          <Avatar name={ctx.member.display_name} className="size-8 text-xs" />
          <div className="hidden leading-tight md:block">
            <p className="max-w-36 truncate text-sm font-medium">{ctx.member.display_name}</p>
            <p className="text-xs text-subtle">{ROLE_LABEL[ctx.role]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
