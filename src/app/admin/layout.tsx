import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, Skeleton } from "@/components/ui";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "./AdminNav";

export const metadata = {
  title: { default: "Super admin", template: "%s · LeadForge admin" },
  robots: { index: false, follow: false },
};

/**
 * Super-admin shell. Nothing, not even the navigation, renders until the
 * visitor is confirmed as a platform admin; everyone else gets a 404. Every
 * admin page and action still runs requirePlatformAdmin() itself, because a
 * layout isn't a security boundary on its own.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();
  const { count: awaitingReply } = await createAdminClient()
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"])
    .eq("last_message_by_staff", false);

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:flex-row lg:overflow-hidden">
      <aside className="flex shrink-0 flex-col gap-4 bg-sidebar p-4 lg:w-60 lg:gap-6">
        <div className="flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-2.5 px-1 text-[17px] font-semibold tracking-tight text-sidebar-fg">
            <LogoMark />
            <span>
              LeadForge <span className="text-xs font-medium tracking-normal text-sidebar-muted">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <Link href="/app" className="rounded-md px-2 py-1 text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg">
              My workspace
            </Link>
            <ThemeToggle className="text-sidebar-muted hover:bg-sidebar-hover" />
          </div>
        </div>
        <nav aria-label="Admin" className="lg:min-h-0 lg:flex-1">
          <AdminNav awaitingReply={awaitingReply ?? 0} />
        </nav>
        <div className="hidden space-y-1 border-t border-sidebar-line pt-3 lg:block">
          <div className="flex items-center gap-2.5 px-3 pb-2">
            <Avatar name={admin.name} className="size-8 text-xs" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-sidebar-fg">{admin.name}</p>
              <p className="truncate text-xs text-sidebar-muted">{admin.email}</p>
            </div>
            <ThemeToggle className="ml-auto text-sidebar-muted hover:bg-sidebar-hover" />
          </div>
          <Link
            href="/app"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back to my workspace
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
            >
              <LogOut aria-hidden className="size-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="scroll-thin min-h-0 min-w-0 flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-bg" aria-busy="true" aria-label="Loading">
      <div className="hidden w-60 shrink-0 bg-sidebar lg:block" />
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
