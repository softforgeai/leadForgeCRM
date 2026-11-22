import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Uptime check: confirms the app is serving and the database answers. */
export async function GET() {
  const started = Date.now();
  try {
    const { error } = await createAdminClient().from("workspaces").select("id", { head: true, count: "estimated" }).limit(1);
    if (error) throw error;
    return NextResponse.json(
      { status: "ok", db: "ok", latencyMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "degraded", db: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
