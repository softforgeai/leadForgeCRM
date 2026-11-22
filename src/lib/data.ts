import "server-only";
import { cookies } from "next/headers";
import { TZ_COOKIE, endOfToday, isValidTimeZone } from "@/lib/time";
import type { Activity, FollowUp, Lead, Member, Stage } from "@/lib/database.types";
import { sanitizeSearch } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCES } from "@/lib/validation";

/**
 * Data access. Every query runs as the signed-in user, so RLS decides what is
 * returned; the explicit workspace filter just scopes it to the active one.
 */

export async function getStages(workspaceId: string): Promise<Stage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw error;
  return data;
}

export async function getMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("display_name");
  if (error) throw error;
  return data;
}

export type LeadFilters = {
  q?: string;
  stage?: string;
  rep?: string;
  source?: string;
  tag?: string;
  sort?: "created" | "value" | "name" | "updated";
  dir?: "asc" | "desc";
  page?: number;
};

export const PAGE_SIZE = 50;

const UUID = /^[0-9a-f-]{36}$/i;

export function parseLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const sort = one("sort");
  return {
    q: one("q")?.slice(0, 100),
    stage: one("stage") && UUID.test(one("stage")!) ? one("stage") : undefined,
    rep: one("rep") === "none" || (one("rep") && UUID.test(one("rep")!)) ? one("rep") : undefined,
    source: (LEAD_SOURCES as readonly string[]).includes(one("source") ?? "") ? one("source") : undefined,
    tag: one("tag")?.toLowerCase().slice(0, 30),
    sort: sort === "value" || sort === "name" || sort === "updated" ? sort : "created",
    dir: one("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Math.min(1000, Number(one("page")) || 1)),
  };
}

export async function getLeads(workspaceId: string, f: LeadFilters) {
  return queryLeads(workspaceId, f, f.page ?? 1, PAGE_SIZE, true);
}

/**
 * All leads matching the filters, fetched in pages of 1,000 (the API's
 * per-request cap) so exports aren't silently truncated.
 */
export async function getAllLeadsForExport(workspaceId: string, f: LeadFilters, max = 20000) {
  const out: Lead[] = [];
  for (let page = 1; out.length < max; page++) {
    const { leads } = await queryLeads(workspaceId, f, page, 1000, false);
    out.push(...leads);
    if (leads.length < 1000) break;
  }
  return out;
}

async function queryLeads(workspaceId: string, f: LeadFilters, page: number, size: number, withCount: boolean) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*", withCount ? { count: "exact" } : undefined)
    .eq("workspace_id", workspaceId);

  if (f.q) {
    const q = sanitizeSearch(f.q);
    if (q) query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (f.stage) query = query.eq("stage_id", f.stage);
  if (f.rep === "none") query = query.is("assigned_to", null);
  else if (f.rep) query = query.eq("assigned_to", f.rep);
  if (f.source) query = query.eq("source", f.source as Lead["source"]);
  if (f.tag) query = query.contains("tags", [f.tag]);

  const column = { created: "created_at", value: "value_cents", name: "name", updated: "updated_at" }[f.sort ?? "created"];
  const from = (page - 1) * size;
  const { data, count, error } = await query
    .order(column, { ascending: f.dir === "asc" })
    .order("id")
    .range(from, from + size - 1);
  if (error) throw error;
  return { leads: data, total: count ?? 0 };
}

/** Lightweight lead list for the Kanban board. */
export async function getBoardLeads(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, company, email, phone, source, value_cents, stage_id, assigned_to, tags, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data;
}

export async function getLead(workspaceId: string, id: string): Promise<Lead | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getActivities(leadId: string): Promise<Activity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function getLeadFollowUps(leadId: string): Promise<FollowUp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("lead_id", leadId)
    .order("due_at");
  if (error) throw error;
  return data;
}

/** The user's timezone from the cookie set by <TimezoneCookie>, defaulting to UTC. */
export async function getUserTimeZone(): Promise<{ tz: string; fromCookie: string | undefined }> {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  const decoded = raw ? decodeURIComponent(raw) : undefined;
  return { tz: isValidTimeZone(decoded) ? decoded : "UTC", fromCookie: decoded };
}

export async function countDueFollowUps(workspaceId: string, userId: string): Promise<number> {
  const { tz } = await getUserTimeZone();
  const supabase = await createClient();
  const { count } = await supabase
    .from("follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .is("completed_at", null)
    .lte("due_at", endOfToday(tz).toISOString());
  return count ?? 0;
}

export type FollowUpWithLead =FollowUp & { lead: { id: string; name: string; company: string | null } | null };

/** Open follow-ups for the signed-in user, due by the end of today (their timezone). */
export async function getMyOpenFollowUps(workspaceId: string, userId: string, until: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*, lead:leads(id, name, company)")
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .is("completed_at", null)
    .lte("due_at", until.toISOString())
    .order("due_at")
    .limit(200);
  if (error) throw error;
  return data as FollowUpWithLead[];
}

export async function getUpcomingFollowUps(workspaceId: string, userId: string, after: Date) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*, lead:leads(id, name, company)")
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .is("completed_at", null)
    .gt("due_at", after.toISOString())
    .order("due_at")
    .limit(10);
  if (error) throw error;
  return data as FollowUpWithLead[];
}

export async function getDashboardData(workspaceId: string) {
  const supabase = await createClient();
  const [stages, statsRes, board] = await Promise.all([
    getStages(workspaceId),
    supabase.rpc("lead_stats", { p_workspace: workspaceId }),
    supabase.rpc("workspace_leaderboard", { p_workspace: workspaceId }),
  ]);
  if (statsRes.error) throw statsRes.error;
  if (board.error) throw board.error;

  // bigint columns can arrive as strings; normalise to numbers.
  const stats = (statsRes.data ?? []).map((r) => ({
    stageId: r.stage_id,
    source: r.source,
    count: Number(r.lead_count),
    value: Number(r.value_cents),
    newThisMonth: Number(r.new_this_month),
  }));
  const kindOf = new Map(stages.map((s) => [s.id, s.kind]));
  const sumWhere = (pred: (r: (typeof stats)[number]) => boolean, key: "count" | "value") =>
    stats.filter(pred).reduce((total, r) => total + r[key], 0);

  const wonCount = sumWhere((r) => kindOf.get(r.stageId) === "won", "count");
  const lostCount = sumWhere((r) => kindOf.get(r.stageId) === "lost", "count");

  return {
    totalLeads: sumWhere(() => true, "count"),
    pipelineValue: sumWhere((r) => kindOf.get(r.stageId) === "open", "value"),
    wonValue: sumWhere((r) => kindOf.get(r.stageId) === "won", "value"),
    winRate: wonCount + lostCount === 0 ? null : wonCount / (wonCount + lostCount),
    newThisMonth: stats.reduce((total, r) => total + r.newThisMonth, 0),
    byStage: stages.map((stage) => ({
      stage,
      count: sumWhere((r) => r.stageId === stage.id, "count"),
      value: sumWhere((r) => r.stageId === stage.id, "value"),
    })),
    bySource: LEAD_SOURCES.map((source) => ({ source, count: sumWhere((r) => r.source === source, "count") })).sort(
      (a, b) => b.count - a.count,
    ),
    leaderboard: (board.data ?? []).map((r) => ({
      ...r,
      won_count: Number(r.won_count),
      won_value_cents: Number(r.won_value_cents),
    })),
  };
}
