"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, invalid, ok, type ActionState } from "@/lib/action-result";
import { requireWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newTicketSchema, replySchema } from "@/lib/support";
import { fieldErrors } from "@/lib/validation";

/** Customer side of support. Every write goes through a database function that checks membership. */

export async function createTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = newTicketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_support_ticket", {
    p_workspace: ctx.workspace.id,
    p_subject: d.subject,
    p_category: d.category,
    p_priority: d.priority,
    p_body: d.body,
    p_page_url: d.pageUrl,
  });
  if (error || !data) return fail(dbErrorMessage(error, "We couldn't send your request. Please try again."));
  redirect(`/app/support/${data}?sent=1`);
}

export async function replyToTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireWorkspace();
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_support_ticket", {
    p_ticket: parsed.data.ticketId,
    p_body: parsed.data.body,
  });
  if (error) return fail(dbErrorMessage(error, "We couldn't send your reply."));
  refresh();
  return ok("Reply sent.");
}

export async function resolveTicket(formData: FormData) {
  await requireWorkspace();
  const id = z.uuid().safeParse(formData.get("ticketId"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_support_ticket", { p_ticket: id.data });
  if (error) console.error("[support]", error);
  refresh();
}
