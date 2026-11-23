import "server-only";
import type { TicketPriorityT, TicketStatusT } from "@/lib/database.types";
import { sanitizeSearch } from "@/lib/format";
import { adminDb } from "@/lib/platform-admin";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support";

/**
 * Data for the super-admin panel. Every function starts with adminDb(), which
 * 404s unless the caller is a platform admin, and then reads across all
 * workspaces with the service role.
 */

const UUID = /^[0-9a-f-]{36}$/i;
const n = (v: number | string | null | undefined) => Number(v ?? 0);

export async function getPlatformOverview() {
  const { db } = await adminDb();
  const [stats, weeks, workspaces, tickets] = await Promise.all([
    db.rpc("admin_platform_stats"),
    db.rpc("admin_signups_by_week", { p_weeks: 12 }),
    db.from("workspaces").select("id, name, is_demo, created_at").eq("is_demo", false).order("created_at", { ascending: false }).limit(6),
    db
      .from("support_tickets")
      .select("id, number, subject, status, priority, last_message_at, last_message_by_staff, workspace:workspaces(name)")
      .not("status", "in", "(resolved,closed)")
      .order("last_message_at", { ascending: false })
      .limit(6),
  ]);
  for (const r of [stats, weeks, workspaces, tickets]) if (r.error) throw r.error;

  const s = stats.data?.[0];
  return {
    stats: {
      workspaces: n(s?.workspaces),
      workspaces30d: n(s?.workspaces_30d),
      users: n(s?.users),
      users30d: n(s?.users_30d),
      activeUsers7d: n(s?.active_users_7d),
      leads: n(s?.leads),
      leads30d: n(s?.leads_30d),
      activeWorkspaces7d: n(s?.active_workspaces_7d),
      openTickets: n(s?.open_tickets),
      urgentTickets: n(s?.urgent_tickets),
      awaitingReply: n(s?.awaiting_reply),
    },
    weeks: (weeks.data ?? []).map((w) => ({ weekStart: w.week_start, workspaces: n(w.workspaces), users: n(w.users) })),
    recentWorkspaces: workspaces.data ?? [],
    recentTickets: tickets.data ?? [],
  };
}

export type OrgSort = "created" | "name" | "leads" | "activity" | "members" | "tickets";

export async function getOrganizations(opts: { q?: string; sort?: OrgSort; showDemo?: boolean }) {
  const { db } = await adminDb();
  const { data, error } = await db.rpc("admin_workspace_overview");
  if (error) throw error;

  let rows = (data ?? []).map((r) => ({
    ...r,
    member_count: n(r.member_count),
    lead_count: n(r.lead_count),
    leads_30d: n(r.leads_30d),
    open_value_cents: n(r.open_value_cents),
    won_value_cents: n(r.won_value_cents),
    open_tickets: n(r.open_tickets),
  }));
  if (!opts.showDemo) rows = rows.filter((r) => !r.is_demo);
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      [r.name, r.owner_name, r.owner_email, r.id].some((v) => v?.toLowerCase().includes(q)),
    );
  }
  const time = (v: string | null) => (v ? new Date(v).getTime() : 0);
  const sorters: Record<OrgSort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    created: (a, b) => time(b.created_at) - time(a.created_at),
    name: (a, b) => a.name.localeCompare(b.name),
    leads: (a, b) => b.lead_count - a.lead_count,
    activity: (a, b) => time(b.last_activity_at) - time(a.last_activity_at),
    members: (a, b) => b.member_count - a.member_count,
    tickets: (a, b) => b.open_tickets - a.open_tickets,
  };
  return rows.sort(sorters[opts.sort ?? "created"]);
}

export async function getOrganization(id: string) {
  if (!UUID.test(id)) return null;
  const { db } = await adminDb();
  const { data: workspace, error } = await db.from("workspaces").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!workspace) return null;

  const [members, stages, stats, tickets, activities, auditLog, invitations] = await Promise.all([
    db.from("workspace_members").select("*").eq("workspace_id", id).order("created_at"),
    db.from("pipeline_stages").select("id, name, kind, position").eq("workspace_id", id).order("position"),
    db.rpc("lead_stats", { p_workspace: id }),
    db
      .from("support_tickets")
      .select("id, number, subject, status, priority, created_by_name, last_message_at, last_message_by_staff")
      .eq("workspace_id", id)
      .order("last_message_at", { ascending: false })
      .limit(20),
    db
      .from("activities")
      .select("id, type, body, meta, actor_id, created_at, lead:leads(id, name)")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
    db
      .from("admin_audit_log")
      .select("id, actor_email, action, target_user_id, details, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("invitations")
      .select("id, email, role, expires_at, accepted_at")
      .eq("workspace_id", id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  for (const r of [members, stages, stats, tickets, activities, auditLog, invitations]) if (r.error) throw r.error;

  const memberRows = members.data ?? [];
  const [activity, admins] = await Promise.all([
    memberRows.length
      ? db.rpc("admin_user_activity", { p_users: memberRows.map((m) => m.user_id) })
      : Promise.resolve({ data: [], error: null }),
    memberRows.length
      ? db.from("platform_admins").select("user_id").in("user_id", memberRows.map((m) => m.user_id))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (activity.error) throw activity.error;
  if (admins.error) throw admins.error;
  const lastSignIn = new Map((activity.data ?? []).map((a) => [a.user_id, a.last_sign_in_at]));
  const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));

  const byStage = new Map<string, { count: number; value: number }>();
  let totalLeads = 0;
  let newThisMonth = 0;
  for (const r of stats.data ?? []) {
    const cur = byStage.get(r.stage_id) ?? { count: 0, value: 0 };
    cur.count += n(r.lead_count);
    cur.value += n(r.value_cents);
    byStage.set(r.stage_id, cur);
    totalLeads += n(r.lead_count);
    newThisMonth += n(r.new_this_month);
  }
  const stageRows = (stages.data ?? []).map((s) => ({ ...s, ...(byStage.get(s.id) ?? { count: 0, value: 0 }) }));
  const sumKind = (kind: string, key: "count" | "value") =>
    stageRows.filter((s) => s.kind === kind).reduce((t, s) => t + s[key], 0);
  const names = new Map(memberRows.map((m) => [m.user_id, m.display_name]));

  return {
    workspace,
    members: memberRows.map((m) => ({
      ...m,
      lastSignInAt: lastSignIn.get(m.user_id) ?? null,
      isPlatformAdmin: adminIds.has(m.user_id),
    })),
    stages: stageRows,
    totals: {
      leads: totalLeads,
      newThisMonth,
      openValue: sumKind("open", "value"),
      wonValue: sumKind("won", "value"),
      wonCount: sumKind("won", "count"),
      lostCount: sumKind("lost", "count"),
    },
    tickets: tickets.data ?? [],
    activities: (activities.data ?? []).map((a) => ({ ...a, actorName: a.actor_id ? names.get(a.actor_id) ?? null : null })),
    auditLog: auditLog.data ?? [],
    pendingInvites: invitations.data ?? [],
  };
}

export type TicketFilters = {
  status?: TicketStatusT | "active" | "all";
  priority?: TicketPriorityT;
  q?: string;
  workspace?: string;
};

export function parseTicketFilters(sp: Record<string, string | string[] | undefined>): TicketFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = one("status");
  const priority = one("priority");
  const workspace = one("workspace");
  return {
    status:
      status === "all" || (TICKET_STATUSES as readonly string[]).includes(status ?? "")
        ? (status as TicketFilters["status"])
        : "active",
    priority: (TICKET_PRIORITIES as readonly string[]).includes(priority ?? "") ? (priority as TicketPriorityT) : undefined,
    q: one("q")?.slice(0, 100),
    workspace: workspace && UUID.test(workspace) ? workspace : undefined,
  };
}

const PRIORITY_RANK: Record<TicketPriorityT, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export async function getTickets(f: TicketFilters) {
  const { db } = await adminDb();
  let query = db
    .from("support_tickets")
    .select(
      "id, number, subject, category, status, priority, created_by_name, created_by_email, created_at, last_message_at, last_message_by_staff, workspace_id, workspace:workspaces(name, is_demo)",
    );
  if (f.status === "active") query = query.not("status", "in", "(resolved,closed)");
  else if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.priority) query = query.eq("priority", f.priority);
  if (f.workspace) query = query.eq("workspace_id", f.workspace);
  if (f.q) {
    const q = sanitizeSearch(f.q);
    const asNumber = Number(q.replace(/^#/, ""));
    if (Number.isInteger(asNumber) && asNumber > 0) query = query.eq("number", asNumber);
    else if (q) query = query.or(`subject.ilike.%${q}%,created_by_email.ilike.%${q}%,created_by_name.ilike.%${q}%`);
  }
  const { data, error } = await query.order("last_message_at", { ascending: false }).limit(200);
  if (error) throw error;
  // Needs-reply first, then by priority, then most recent.
  return (data ?? []).sort((a, b) => {
    const needsA = !a.last_message_by_staff && a.status !== "resolved" && a.status !== "closed" ? 0 : 1;
    const needsB = !b.last_message_by_staff && b.status !== "resolved" && b.status !== "closed" ? 0 : 1;
    return needsA - needsB || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

export async function getTicketForStaff(id: string) {
  if (!UUID.test(id)) return null;
  const { db } = await adminDb();
  const { data: ticket, error } = await db
    .from("support_tickets")
    .select("*, workspace:workspaces(id, name, is_demo)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) return null;
  const [messages, member] = await Promise.all([
    db.from("support_messages").select("*").eq("ticket_id", id).order("created_at"),
    ticket.created_by
      ? db
          .from("workspace_members")
          .select("user_id, role, display_name")
          .eq("workspace_id", ticket.workspace_id)
          .eq("user_id", ticket.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (messages.error) throw messages.error;
  return { ticket, messages: messages.data ?? [], reporter: member.data };
}

export const AUDIT_PAGE_SIZE = 50;

export async function getAuditLog(page: number) {
  const { db } = await adminDb();
  const from = (page - 1) * AUDIT_PAGE_SIZE;
  const { data, count, error } = await db
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);
  if (error) throw error;
  const wsIds = [...new Set((data ?? []).map((r) => r.workspace_id).filter((v): v is string => Boolean(v)))];
  const { data: workspaces } = wsIds.length
    ? await db.from("workspaces").select("id, name").in("id", wsIds)
    : { data: [] as { id: string; name: string }[] };
  const wsName = new Map((workspaces ?? []).map((w) => [w.id, w.name]));
  return {
    rows: (data ?? []).map((r) => ({ ...r, workspaceName: r.workspace_id ? wsName.get(r.workspace_id) ?? null : null })),
    total: count ?? 0,
  };
}

export async function getSupportSessions(limit = 25) {
  const { db } = await adminDb();
  const { data, error } = await db
    .from("impersonation_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
