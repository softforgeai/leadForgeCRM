import { Suspense } from "react";
import { Alert } from "@/components/ui";
import { getWorkspaceContext } from "@/lib/auth";
import { SettingsTabs } from "./SettingsTabs";

export default function SettingsLayout({ children }: LayoutProps<"/app/settings">) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Manage your workspace, pipeline, team and lead capture.</p>
      </div>
      <SettingsTabs />
      <Suspense fallback={null}>
        <AccessNotice />
      </Suspense>
      <div className="mt-6 space-y-8">{children}</div>
    </div>
  );
}

async function AccessNotice() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return null;
  if (ctx.workspace.is_demo) {
    return (
      <div className="mt-5">
        <Alert tone="warning">Settings are read-only in the demo workspace. Create your own workspace to try them out.</Alert>
      </div>
    );
  }
  if (!ctx.isManager) {
    return (
      <div className="mt-5">
        <Alert tone="neutral">You&apos;re a sales rep in this workspace, so settings are view-only. Ask an owner or admin to make changes.</Alert>
      </div>
    );
  }
  return null;
}
