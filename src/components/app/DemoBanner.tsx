import { getWorkspaceContext } from "@/lib/auth";

export async function DemoBanner() {
  const ctx = await getWorkspaceContext();
  if (!ctx?.workspace.is_demo) return null;
  return (
    <div className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-center text-xs text-warning sm:text-sm">
      You&apos;re exploring a demo workspace with fictional data. Click around freely; it resets every night.
    </div>
  );
}
