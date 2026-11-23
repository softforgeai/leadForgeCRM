import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformAdmin = { id: string; email: string; name: string };

/**
 * The signed-in user if they are SoftForge staff (a row in platform_admins),
 * otherwise null. The table has no RLS policies, so only the service role can
 * read it; users can't see or change who is an admin.
 */
export const getPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await createAdminClient()
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const email = user.email ?? "";
  const metaName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  return { id: user.id, email, name: metaName.trim() || email.split("@")[0] || "Support" };
});

/**
 * Guards every admin page and action. Non-admins get a plain 404 so the panel's
 * existence isn't revealed. Call this in each page and action, not only in the
 * layout: layouts don't re-run on every navigation, so they aren't a security
 * boundary.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const admin = await getPlatformAdmin();
  if (!admin) notFound();
  return admin;
}

/**
 * Service-role client for the admin panel, handed out only after the caller
 * is confirmed as a platform admin. It bypasses RLS, so keep its use inside
 * src/app/admin and src/lib/admin-data.ts.
 */
export async function adminDb() {
  const admin = await requirePlatformAdmin();
  return { admin, db: createAdminClient() };
}

export type AuditEntry = {
  action: string;
  workspaceId?: string | null;
  targetUserId?: string | null;
  ticketId?: string | null;
  details?: Json;
};

/** Appends to the admin audit log. Failures are logged, never shown to users. */
export async function audit(actor: { id: string; email: string }, entry: AuditEntry) {
  const { error } = await createAdminClient()
    .from("admin_audit_log")
    .insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action: entry.action,
      workspace_id: entry.workspaceId ?? null,
      target_user_id: entry.targetUserId ?? null,
      ticket_id: entry.ticketId ?? null,
      details: entry.details ?? {},
    });
  if (error) console.error("[audit]", error);
}
