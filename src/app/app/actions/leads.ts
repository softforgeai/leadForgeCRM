"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, invalid, ok, type ActionState } from "@/lib/action-result";
import { requireWorkspace, type WorkspaceContext } from "@/lib/auth";
import { mapHeaders, parseCsv } from "@/lib/csv";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_SOURCES,
  activitySchema,
  fieldErrors,
  followUpSchema,
  leadSchema,
  moneyToCents,
  tagsInput,
} from "@/lib/validation";

/**
 * Reps can only assign leads to themselves; the database enforces this too,
 * but resolving it here gives a clear error instead of a permission failure.
 */
function resolveAssignee(ctx: WorkspaceContext, requested: string | null): string | null {
  if (!ctx.isManager) return ctx.userId;
  return requested;
}

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: ctx.workspace.id,
      name: d.name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      source: d.source,
      value_cents: d.value,
      stage_id: d.stageId,
      assigned_to: resolveAssignee(ctx, d.assignedTo),
      tags: d.tags,
      notes: d.notes,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error, "We couldn't save this lead."));
  redirect(`/app/leads/${data.id}`);
}

export async function updateLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Invalid request.");
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      name: d.name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      source: d.source,
      value_cents: d.value,
      stage_id: d.stageId,
      assigned_to: resolveAssignee(ctx, d.assignedTo),
      tags: d.tags,
      notes: d.notes,
    })
    .eq("id", id.data)
    .eq("workspace_id", ctx.workspace.id)
    .select("id");
  if (error) return fail(dbErrorMessage(error, "We couldn't save your changes."));
  if (!data?.length) return fail("This lead no longer exists or isn't assigned to you.");
  refresh();
  return ok("Lead saved.");
}

/** Used by the Kanban board and the stage picker. */
export async function moveLead(leadId: string, stageId: string): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = z.object({ leadId: z.uuid(), stageId: z.uuid() }).safeParse({ leadId, stageId });
  if (!parsed.success) return fail("Invalid request.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ stage_id: parsed.data.stageId })
    .eq("id", parsed.data.leadId)
    .eq("workspace_id", ctx.workspace.id)
    .select("id");
  if (error) return fail(dbErrorMessage(error, "We couldn't move this lead."));
  if (!data?.length) return fail("This lead no longer exists or isn't assigned to you.");
  refresh();
  return ok();
}

export async function deleteLead(formData: FormData) {
  const ctx = await requireWorkspace();
  if (!ctx.isManager) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id.data).eq("workspace_id", ctx.workspace.id);
  redirect("/app/leads");
}

export async function addActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    workspace_id: ctx.workspace.id,
    lead_id: parsed.data.leadId,
    actor_id: ctx.userId,
    type: parsed.data.type,
    body: parsed.data.body,
  });
  if (error) return fail(dbErrorMessage(error, "We couldn't add this entry."));
  refresh();
  return ok("Added to the timeline.");
}

export async function createFollowUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = followUpSchema.safeParse({
    ...Object.fromEntries(formData),
    assignedTo: formData.get("assignedTo") || undefined,
  });
  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const tzOffset = Number(formData.get("tzOffset") ?? 0);
  const dueAt = localDateTimeToIso(parsed.data.dueAt, Number.isFinite(tzOffset) ? tzOffset : 0);

  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").insert({
    workspace_id: ctx.workspace.id,
    lead_id: parsed.data.leadId,
    assigned_to: ctx.isManager ? (parsed.data.assignedTo ?? ctx.userId) : ctx.userId,
    task: parsed.data.task,
    due_at: dueAt,
    created_by: ctx.userId,
  });
  if (error) return fail(dbErrorMessage(error, "We couldn't save the follow-up."));
  refresh();
  return ok("Follow-up scheduled.");
}

export async function toggleFollowUp(formData: FormData) {
  const ctx = await requireWorkspace();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const done = formData.get("done") === "true";
  const supabase = await createClient();
  await supabase
    .from("follow_ups")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id.data)
    .eq("workspace_id", ctx.workspace.id);
  refresh();
}

/**
 * <input type="datetime-local"> has no timezone. The browser sends its UTC
 * offset (minutes, as from Date#getTimezoneOffset) so the due time is stored
 * correctly.
 */
function localDateTimeToIso(local: string, offsetMinutes: number): string {
  const asUtc = Date.parse(`${local.length === 10 ? `${local}T09:00` : local}:00Z`);
  return new Date(asUtc + offsetMinutes * 60_000).toISOString();
}

/* ------------------------------------------------------------ CSV import */

const MAX_IMPORT_BYTES = 1_000_000;
const MAX_IMPORT_ROWS = 2000;

export type ImportState =
  | { ok: true; imported: number; skipped: { row: number; reason: string }[] }
  | { ok: false; error: string }
  | undefined;

const importRow = z.object({
  name: z.string().trim().min(1, "missing name").max(120, "name too long"),
  company: z.string().trim().max(120).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((v) => v === "" || z.email().safeParse(v).success, "invalid email")
    .optional(),
  phone: z.string().trim().max(40).optional(),
  source: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (LEAD_SOURCES as readonly string[]).includes(v ?? "") ? (v as (typeof LEAD_SOURCES)[number]) : "other"),
  value: moneyToCents.optional(),
  tags: tagsInput,
  notes: z.string().trim().max(5000).optional(),
});

export async function importLeads(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const ctx = await requireWorkspace();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file to import." };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: "That file is too large. The limit is 1 MB." };
  if (!/\.csv$/i.test(file.name)) return { ok: false, error: "Please upload a .csv file." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { ok: false, error: "The file needs a header row and at least one lead." };
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { ok: false, error: `You can import up to ${MAX_IMPORT_ROWS} leads at a time.` };
  }

  const columns = mapHeaders(rows[0]!);
  if (columns.name === undefined) return { ok: false, error: 'The file needs a "Name" column.' };

  const supabase = await createClient();
  const { data: firstStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("kind", "open")
    .order("position")
    .limit(1)
    .single();
  if (!firstStage) return { ok: false, error: "Your pipeline needs at least one open stage." };

  const skipped: { row: number; reason: string }[] = [];
  const inserts: Database["public"]["Tables"]["leads"]["Insert"][] = [];
  rows.slice(1).forEach((cells, i) => {
    const get = (field: keyof typeof columns) => {
      const idx = columns[field];
      return idx === undefined ? undefined : (cells[idx] ?? "");
    };
    const parsed = importRow.safeParse({
      name: get("name"),
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      source: get("source"),
      value: get("value") ?? "",
      tags: get("tags"),
      notes: get("notes"),
    });
    if (!parsed.success) {
      skipped.push({ row: i + 2, reason: parsed.error.issues[0]?.message ?? "invalid row" });
      return;
    }
    const d = parsed.data;
    inserts.push({
      workspace_id: ctx.workspace.id,
      name: d.name,
      company: d.company || null,
      email: d.email || null,
      phone: d.phone || null,
      source: d.source,
      value_cents: d.value ?? 0,
      stage_id: firstStage.id,
      assigned_to: ctx.userId,
      tags: d.tags,
      notes: d.notes || null,
      created_by: ctx.userId,
    });
  });

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabase.from("leads").insert(inserts.slice(i, i + 500));
    if (error) {
      return { ok: false, error: dbErrorMessage(error, `Import stopped after ${i} leads. Please check the file.`) };
    }
  }
  refresh();
  return { ok: true, imported: inserts.length, skipped: skipped.slice(0, 50) };
}
