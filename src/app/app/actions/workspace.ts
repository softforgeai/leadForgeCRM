"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, invalid, ok, type ActionState } from "@/lib/action-result";
import { WORKSPACE_COOKIE, getUser, requireWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, inviteSchema } from "@/lib/validation";

const nameField = z.string().trim().min(1, "Required").max(80, "Use 80 characters or fewer");

async function setWorkspaceCookie(id: string) {
  (await cookies()).set(WORKSPACE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createWorkspace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const demoEmail = process.env.DEMO_EMAIL?.toLowerCase();
  if (demoEmail && user.email?.toLowerCase() === demoEmail) {
    return fail("The demo account can't create workspaces. Sign up for your own account instead.");
  }
  const parsed = z
    .object({ workspaceName: nameField, displayName: nameField })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.workspaceName,
    p_display_name: parsed.data.displayName,
  });
  if (error || !data) return fail(dbErrorMessage(error, "We couldn't create the workspace."));
  await setWorkspaceCookie(data);
  redirect("/app");
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const parsed = z
    .object({ token: z.string().regex(/^[a-f0-9]{32}$/), displayName: nameField })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: parsed.data.token,
    p_display_name: parsed.data.displayName,
  });
  if (error || !data) return fail(dbErrorMessage(error, "We couldn't accept this invitation."));
  await setWorkspaceCookie(data);
  redirect("/app");
}

export async function switchWorkspace(formData: FormData) {
  const ctx = await requireWorkspace();
  const id = String(formData.get("workspaceId") ?? "");
  // Only switch to a workspace the user actually belongs to.
  if (ctx.memberships.some((m) => m.workspace.id === id)) await setWorkspaceCookie(id);
  redirect("/app");
}

/* ------------------------------------------------------- manager actions */

async function requireManager() {
  const ctx = await requireWorkspace();
  if (!ctx.isManager) return { ctx, error: "Only owners and admins can change workspace settings." };
  if (ctx.workspace.is_demo) return { ctx, error: "Workspace settings are locked in the demo." };
  return { ctx, error: null };
}

export async function updateWorkspace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const parsed = z
    .object({
      name: nameField,
      logoUrl: z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use an https:// image URL")
        .transform((v) => (v === "" ? null : v)),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, logo_url: parsed.data.logoUrl })
    .eq("id", ctx.workspace.id);
  if (error) return fail(dbErrorMessage(error, "We couldn't save your changes."));
  refresh();
  return ok("Workspace updated.");
}

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    workspace_id: ctx.workspace.id,
    email: parsed.data.email,
    role: parsed.data.role,
    invited_by: ctx.userId,
  });
  if (error) return fail(dbErrorMessage(error, "We couldn't create the invitation."));
  refresh();
  return ok("Invitation created. Copy the link below and send it to your teammate.");
}

export async function revokeInvite(formData: FormData) {
  const { ctx, error: denied } = await requireManager();
  if (denied) return;
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("workspace_id", ctx.workspace.id);
  refresh();
}

export async function setMemberRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const parsed = z
    .object({ userId: z.uuid(), role: z.enum(["admin", "rep"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_workspace: ctx.workspace.id,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return fail(dbErrorMessage(error, "We couldn't change that role."));
  refresh();
  return ok("Role updated.");
}

export async function removeMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const userId = z.uuid().safeParse(formData.get("userId"));
  if (!userId.success) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_workspace: ctx.workspace.id, p_user: userId.data });
  if (error) return fail(dbErrorMessage(error, "We couldn't remove that member."));
  refresh();
  return ok("Member removed. Their leads are now unassigned.");
}

export async function regenerateFormLink(): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_form_token", { p_workspace: ctx.workspace.id });
  if (error) return fail(dbErrorMessage(error, "We couldn't create a new link."));
  refresh();
  return ok("New form link created. The old link no longer works.");
}

/* ------------------------------------------------------------- stages */

export async function renameStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const parsed = z
    .object({ id: z.uuid(), name: z.string().trim().min(1, "Required").max(40) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("workspace_id", ctx.workspace.id);
  if (error) return fail(dbErrorMessage(error, "We couldn't rename that stage."));
  refresh();
  return ok("Saved.");
}

export async function addStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const name = z.string().trim().min(1, "Required").max(40).safeParse(formData.get("name"));
  if (!name.success) return invalid({ name: name.error.issues[0]!.message });

  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, position, kind")
    .eq("workspace_id", ctx.workspace.id)
    .order("position");
  if ((stages?.length ?? 0) >= 12) return fail("A pipeline can have at most 12 stages.");

  // New open stages go before Won/Lost.
  const lastOpen = Math.max(-1, ...(stages ?? []).filter((s) => s.kind === "open").map((s) => s.position));
  const closed = (stages ?? []).filter((s) => s.kind !== "open");
  for (const s of closed) {
    await supabase.from("pipeline_stages").update({ position: s.position + 1 }).eq("id", s.id);
  }
  const { error } = await supabase
    .from("pipeline_stages")
    .insert({ workspace_id: ctx.workspace.id, name: name.data, position: lastOpen + 1, kind: "open" });
  if (error) return fail(dbErrorMessage(error, "We couldn't add that stage."));
  refresh();
  return ok("Stage added.");
}

export async function deleteStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, error: denied } = await requireManager();
  if (denied) return fail(denied);
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Invalid request.");

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("kind")
    .eq("id", id.data)
    .eq("workspace_id", ctx.workspace.id)
    .single();
  if (!stage) return fail("Stage not found.");
  if (stage.kind !== "open") return fail("The Won and Lost stages can't be removed.");

  const { count } = await supabase
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspace.id)
    .eq("kind", "open");
  if ((count ?? 0) <= 1) return fail("Keep at least one open stage.");

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", id.data)
    .eq("workspace_id", ctx.workspace.id);
  if (error) {
    if (error.code === "23503") return fail("Move this stage's leads to another stage before removing it.");
    return fail(dbErrorMessage(error, "We couldn't remove that stage."));
  }
  refresh();
  return ok("Stage removed.");
}
