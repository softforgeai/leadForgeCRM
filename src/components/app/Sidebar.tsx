import Link from "next/link";
import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { switchWorkspace } from "@/app/app/actions/workspace";
import { LogoMark } from "@/components/LogoMark";
import type { WorkspaceContext } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

export const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

function SidebarLogo() {
  return (
    <Link href="/app" className="flex items-center gap-2.5 px-1 text-[17px] font-semibold tracking-tight text-sidebar-fg">
      <LogoMark />
      LeadForge
    </Link>
  );
}

function WorkspaceSwitcher({ ctx }: { ctx: WorkspaceContext }) {
  const initial = ctx.workspace.name.trim()[0]?.toUpperCase() ?? "W";
  const badge = (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-sm font-semibold text-sidebar-fg">
      {initial}
    </span>
  );
  if (ctx.memberships.length <= 1) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-line p-2">
        {badge}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sidebar-fg">{ctx.workspace.name}</p>
          <p className="text-xs text-sidebar-muted">{ROLE_LABEL[ctx.role]}</p>
        </div>
      </div>
    );
  }
  return (
    <form action={switchWorkspace} className="relative flex items-center gap-2.5 rounded-lg border border-sidebar-line p-2">
      {badge}
      <label htmlFor="workspace-switch" className="sr-only">
        Switch workspace
      </label>
      <select
        id="workspace-switch"
        name="workspaceId"
        defaultValue={ctx.workspace.id}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-sm font-medium text-sidebar-fg focus:outline-none [&>option]:text-black"
      >
        {ctx.memberships.map((m) => (
          <option key={m.workspace.id} value={m.workspace.id}>
            {m.workspace.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown aria-hidden className="pointer-events-none absolute right-16 size-4 text-sidebar-muted" />
      <button type="submit" className="rounded px-2 py-1 text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg">
        Switch
      </button>
    </form>
  );
}

/** Sidebar contents, shared by the desktop sidebar and the mobile slide-over. */
type SidebarProps = { ctx: WorkspaceContext; dueCount: number; isPlatformAdmin?: boolean };

export function SidebarBody({ ctx, dueCount, isPlatformAdmin }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <SidebarLogo />
      <WorkspaceSwitcher ctx={ctx} />
      <nav aria-label="Main" className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <NavLinks dueCount={dueCount} />
      </nav>
      {isPlatformAdmin && (
        <Link
          href="/admin"
          className="-mb-3 flex items-center gap-3 rounded-md border-t border-sidebar-line px-3 pt-3 pb-2 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
        >
          <ShieldCheck aria-hidden className="size-4" /> Super admin
        </Link>
      )}
      <form action={signOut} className="border-t border-sidebar-line pt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
        >
          <LogOut aria-hidden className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <SidebarBody {...props} />
    </aside>
  );
}
