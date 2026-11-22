import { Suspense } from "react";
import { DemoBanner } from "@/components/app/DemoBanner";
import { Sidebar } from "@/components/app/Sidebar";
import { TimezoneCookie } from "@/components/app/TimezoneCookie";
import { Skeleton } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { countDueFollowUps, getUserTimeZone } from "@/lib/data";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Suspense fallback={<SidebarFallback />}>
        <Shell />
      </Suspense>
      <div className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

async function Shell() {
  const ctx = await requireWorkspace();
  const [dueCount, { fromCookie }] = await Promise.all([
    countDueFollowUps(ctx.workspace.id, ctx.userId),
    getUserTimeZone(),
  ]);
  return (
    <>
      <TimezoneCookie current={fromCookie} />
      <Sidebar ctx={ctx} dueCount={dueCount} />
    </>
  );
}

function SidebarFallback() {
  return (
    <>
      <div className="hidden h-dvh w-64 shrink-0 space-y-3 border-r border-line bg-surface p-4 lg:block">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9" />
        <Skeleton className="mt-6 h-48" />
      </div>
      <div className="h-14 border-b border-line bg-surface lg:hidden" />
    </>
  );
}
