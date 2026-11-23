"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionState } from "@/lib/action-result";
import { WORKSPACE_COOKIE } from "@/lib/auth";
import { SUPPORT_SESSION_MINUTES, readStash, writeStash } from "@/lib/impersonation";
import { adminDb, audit } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { staffReplySchema, ticketUpdateSchema } from "@/lib/support";
import { fieldErrors } from "@/lib/validation";

/* ------------------------------------------------------------ log in as */

const startSchema = z.object({
  userId: z.uuid(),
  workspaceId: z.uuid(),
  reason: z.string().trim().min(5, "Say briefly why you need access (at least 5 characters)").max(300),
});

/**
 * Signs this browser in as a customer so staff can see exactly what they see.
 * The admin's own session is set aside and restored when the session ends.
 */
export async function startSupportSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, db } = await adminDb();
  const parsed = startSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));
  const { userId, workspaceId, reason } = parsed.data;

  if (userId === admin.id) return fail("That's your own account.");
  if (await readStash()) return fail("You're already in a support session. Exit it first.");

  const [{ data: member }, { data: targetAdmin }, { data: target }] = await Promise.all([
    db.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle(),
    db.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
  ]);
  if (!member) return fail("That person isn't a member of this organization.");
  if (targetAdmin) return fail("You can't log in as another platform admin.");
  const email = target?.user?.email;
  if (!email) return fail("That account has no email address, so it can't be opened.");

  // The admin's own tokens, to restore later. Identity was verified with
  // getUser() in adminDb(); this only reads the matching cookie session.
  const supabase = await createClient();
  const { data: current } = await supabase.auth.getSession();
  if (!current.session || current.session.user.id !== admin.id) return fail("Your session has expired. Sign in again.");

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_MINUTES * 60_000);
  const { data: session, error: sessionError } = await db
    .from("impersonation_sessions")
    .insert({ admin_id: admin.id, target_user_id: userId, workspace_id: workspaceId, reason, expires_at: expiresAt.toISOString() })
    .select("id")
    .single();
  if (sessionError || !session) {
    console.error("[support-session]", sessionError);
    return fail("We couldn't start the support session.");
  }

  // A one-time sign-in token for the customer. generateLink doesn't send an
  // email; the token is used immediately, server-side, and never leaves here.
  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  const verified = tokenHash ? await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash }) : null;
  if (linkError || !verified || verified.error || !verified.data.session) {
    console.error("[support-session]", linkError ?? verified?.error);
    await db.from("impersonation_sessions").update({ ended_at: new Date().toISOString() }).eq("id", session.id);
    // If verification half-failed, put the admin's session back.
    await supabase.auth.setSession({ access_token: current.session.access_token, refresh_token: current.session.refresh_token });
    return fail("We couldn't open that account.");
  }

  const store = await cookies();
  await writeStash({
    sid: session.id,
    at: current.session.access_token,
    rt: current.session.refresh_token,
    ws: store.get(WORKSPACE_COOKIE)?.value ?? null,
    exp: expiresAt.getTime(),
  });
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await audit(admin, {
    action: "impersonation.start",
    workspaceId,
    targetUserId: userId,
    details: { session_id: session.id, reason, target_email: email, minutes: SUPPORT_SESSION_MINUTES },
  });
  redirect("/app");
}

/* -------------------------------------------------------------- tickets */

export async function replyAsStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, db } = await adminDb();
  const parsed = staffReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));
  const { ticketId, body, internal, status } = parsed.data;

  const { data: ticket } = await db.from("support_tickets").select("id, workspace_id, status").eq("id", ticketId).maybeSingle();
  if (!ticket) return fail("Ticket not found.");

  const { error } = await db.from("support_messages").insert({
    ticket_id: ticketId,
    author_id: admin.id,
    author_name: admin.name.slice(0, 80),
    is_staff: true,
    is_internal: internal,
    body,
  });
  if (error) {
    console.error("[support]", error);
    return fail("We couldn't send that reply.");
  }

  if (status && status !== ticket.status) {
    await db
      .from("support_tickets")
      .update({ status, resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null })
      .eq("id", ticketId);
  }

  await audit(admin, {
    action: internal ? "ticket.internal_note" : "ticket.reply",
    workspaceId: ticket.workspace_id,
    ticketId,
    details: status && status !== ticket.status ? { status_from: ticket.status, status_to: status } : {},
  });
  refresh();
  return ok(internal ? "Internal note added." : "Reply sent.");
}

export async function updateTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { admin, db } = await adminDb();
  const parsed = ticketUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");
  const { ticketId, status, priority } = parsed.data;

  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, workspace_id, status, priority")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return fail("Ticket not found.");
  if (ticket.status === status && ticket.priority === priority) return ok("No changes.");

  const closing = status === "resolved" || status === "closed";
  const { error } = await db
    .from("support_tickets")
    .update({ status, priority, resolved_at: closing ? new Date().toISOString() : null })
    .eq("id", ticketId);
  if (error) {
    console.error("[support]", error);
    return fail("We couldn't update the ticket.");
  }
  await audit(admin, {
    action: "ticket.update",
    workspaceId: ticket.workspace_id,
    ticketId,
    details: { status_from: ticket.status, status_to: status, priority_from: ticket.priority, priority_to: priority },
  });
  refresh();
  return ok("Ticket updated.");
}
