import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE, getUser } from "@/lib/auth";
import { audit } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_SESSION_COOKIE, decodeStash, encodeStash, type SupportStash } from "@/lib/support-session-cookie";

/**
 * "Log in as" for platform admins.
 *
 * Starting a support session signs the admin's browser in as the customer
 * (a real Supabase session, so RLS shows exactly what the customer sees). The
 * admin's own session is kept aside in an httpOnly cookie and restored when
 * the session ends. Every session has a database record with the admin, the
 * customer, the reason, and a hard expiry; start and end are audit-logged.
 */

export { SUPPORT_SESSION_COOKIE };
export const SUPPORT_SESSION_MINUTES = 60;

export async function readStash() {
  return decodeStash((await cookies()).get(SUPPORT_SESSION_COOKIE)?.value);
}

export async function writeStash(stash: SupportStash) {
  (await cookies()).set(SUPPORT_SESSION_COOKIE, encodeStash(stash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Outlives the session on purpose: if the cookie vanished at expiry, the
    // browser would stay signed in as the customer with no banner. Keeping it
    // lets the proxy notice the expiry and restore the admin.
    maxAge: 60 * 60 * 24 * 7,
  });
}

export type ActiveSupportSession = {
  id: string;
  expiresAt: string;
  expired: boolean;
  reason: string;
  workspaceId: string | null;
  workspaceName: string | null;
  customerName: string;
  customerEmail: string;
};

/**
 * The support session for this request, if the signed-in user is being
 * impersonated. Checked against the database record, so a hand-made cookie
 * can't fake the banner or extend a session.
 */
export const getActiveSupportSession = cache(async (): Promise<ActiveSupportSession | null> => {
  const stash = await readStash();
  if (!stash) return null;
  const user = await getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data: session } = await db
    .from("impersonation_sessions")
    .select("id, target_user_id, workspace_id, reason, expires_at, ended_at")
    .eq("id", stash.sid)
    .maybeSingle();
  if (!session || session.target_user_id !== user.id || session.ended_at) return null;

  const [{ data: ws }, { data: member }] = await Promise.all([
    session.workspace_id
      ? db.from("workspaces").select("name").eq("id", session.workspace_id).maybeSingle()
      : Promise.resolve({ data: null }),
    session.workspace_id
      ? db
          .from("workspace_members")
          .select("display_name")
          .eq("workspace_id", session.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: session.id,
    expiresAt: session.expires_at,
    expired: new Date(session.expires_at).getTime() <= Date.now(),
    reason: session.reason,
    workspaceId: session.workspace_id,
    workspaceName: ws?.name ?? null,
    customerName: member?.display_name ?? user.email ?? "Customer",
    customerEmail: user.email ?? "",
  };
});

/**
 * Ends the support session in this browser: revokes the customer session that
 * was created for it (only that one; the customer's own devices stay signed
 * in), restores the admin's session, and records the end. Returns where to go
 * next. Safe to call when no session is active.
 */
export async function endSupportSession(): Promise<string> {
  const stash = await readStash();
  const store = await cookies();
  if (!stash) return "/app";

  const supabase = await createClient();
  // scope "local": the default ("global") would sign the customer out everywhere.
  await supabase.auth.signOut({ scope: "local" });
  const { data: restored, error: restoreError } = await supabase.auth.setSession({
    access_token: stash.at,
    refresh_token: stash.rt,
  });

  store.delete(SUPPORT_SESSION_COOKIE);
  if (stash.ws) {
    store.set(WORKSPACE_COOKIE, stash.ws, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    store.delete(WORKSPACE_COOKIE);
  }

  const db = createAdminClient();
  const { data: session } = await db
    .from("impersonation_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", stash.sid)
    .is("ended_at", null)
    .select("admin_id, target_user_id, workspace_id, expires_at")
    .maybeSingle();

  if (session) {
    const { data: adminUser } = await db.auth.admin.getUserById(session.admin_id);
    await audit(
      { id: session.admin_id, email: adminUser?.user?.email ?? "" },
      {
        action: "impersonation.end",
        workspaceId: session.workspace_id,
        targetUserId: session.target_user_id,
        details: { session_id: stash.sid, expired: new Date(session.expires_at).getTime() <= Date.now() },
      },
    );
  }

  // The admin's refresh token can be gone if they signed out elsewhere or it
  // expired; then they simply sign in again.
  if (restoreError || !restored.session) return "/login?next=/admin";
  return session?.workspace_id ? `/admin/organizations/${session.workspace_id}` : "/admin";
}
