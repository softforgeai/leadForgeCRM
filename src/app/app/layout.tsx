import { Suspense } from "react";
import { DemoBanner } from "@/components/app/DemoBanner";
import { SupportSessionBanner } from "@/components/app/SupportSessionBanner";
import { Sidebar } from "@/components/app/Sidebar";
import { TimezoneCookie } from "@/components/app/TimezoneCookie";
import { TopBar } from "@/components/app/TopBar";
import { requireWorkspace } from "@/lib/auth";
import { countDueFollowUps, getUserTimeZone } from "@/lib/data";
import { getPlatformAdmin } from "@/lib/platform-admin";

/**
 * App shell: the sidebar and top bar stay fixed and only <main> scrolls, so
 * wide content (the pipeline board, tables) never scrolls the whole page.
 *
 * Pages that mark an element with `data-fullbleed` (the pipeline) get the full
 * width and height of the content area instead of the centred container.
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <Suspense fallback={null}>
        <SupportSessionBanner />
      </Suspense>
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<div className="hidden w-60 shrink-0 bg-sidebar lg:block" />}>
          <SidebarSlot />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div className="h-14 shrink-0 border-b border-line bg-surface" />}>
            <TopBarSlot />
          </Suspense>
          <Suspense fallback={null}>
            <DemoBanner />
          </Suspense>
          <main className="scroll-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 has-[[data-fullbleed]]:h-full has-[[data-fullbleed]]:max-w-none has-[[data-fullbleed]]:py-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

async function loadShell() {
  const ctx = await requireWorkspace();
  const [dueCount, tz, admin] = await Promise.all([
    countDueFollowUps(ctx.workspace.id, ctx.userId),
    getUserTimeZone(),
    getPlatformAdmin(),
  ]);
  return { ctx, dueCount, tz, isPlatformAdmin: Boolean(admin) };
}

async function SidebarSlot() {
  const { ctx, dueCount, isPlatformAdmin } = await loadShell();
  return <Sidebar ctx={ctx} dueCount={dueCount} isPlatformAdmin={isPlatformAdmin} />;
}

async function TopBarSlot() {
  const { ctx, dueCount, tz, isPlatformAdmin } = await loadShell();
  return (
    <>
      <TimezoneCookie current={tz.fromCookie} />
      <TopBar ctx={ctx} dueCount={dueCount} isPlatformAdmin={isPlatformAdmin} />
    </>
  );
}
