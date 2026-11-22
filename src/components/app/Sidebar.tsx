import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { switchWorkspace } from "@/app/app/actions/workspace";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, Badge } from "@/components/ui";
import type { WorkspaceContext } from "@/lib/auth";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

function SidebarBody({ ctx, dueCount }: { ctx: WorkspaceContext; dueCount: number }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-3">
        <Link href="/app" className="hidden lg:inline-flex">
          <Logo />
        </Link>
        {ctx.memberships.length > 1 ? (
          <form action={switchWorkspace} className="flex gap-2">
            <label htmlFor="workspace-switch" className="sr-only">
              Workspace
            </label>
            <select
              id="workspace-switch"
              name="workspaceId"
              defaultValue={ctx.workspace.id}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2 text-sm"
            >
              {ctx.memberships.map((m) => (
                <option key={m.workspace.id} value={m.workspace.id}>
                  {m.workspace.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-line-strong px-2 text-xs text-muted hover:text-fg">
              Switch
            </button>
          </form>
        ) : (
          <p className="truncate rounded-lg bg-surface-2 px-2.5 py-2 text-sm font-medium">{ctx.workspace.name}</p>
        )}
      </div>

      <nav aria-label="Main" className="flex-1">
        <NavLinks dueCount={dueCount} />
      </nav>

      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={ctx.member.display_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ctx.member.display_name}</p>
            <p className="text-xs text-subtle">{ROLE_LABEL[ctx.role]}</p>
          </div>
          <ThemeToggle />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
          >
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ ctx, dueCount }: { ctx: WorkspaceContext; dueCount: number }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-surface p-4 lg:block">
        <SidebarBody ctx={ctx} dueCount={dueCount} />
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <MobileNav>
          <SidebarBody ctx={ctx} dueCount={dueCount} />
        </MobileNav>
        <Link href="/app">
          <Logo />
        </Link>
        {ctx.workspace.is_demo ? <Badge tone="warning">Demo</Badge> : <span className="w-9" />}
      </header>
    </>
  );
}
