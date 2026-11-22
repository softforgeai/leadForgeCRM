/**
 * Creates (or resets) the public demo workspace with realistic, clearly
 * fictional data. Safe to run repeatedly; the nightly GitHub Action runs it.
 *
 *   node --env-file=.env.local scripts/seed-demo.mts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_EMAIL, DEMO_PASSWORD
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const demoEmail = process.env.DEMO_EMAIL;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !secret || !demoEmail || !demoPassword) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_EMAIL or DEMO_PASSWORD");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// Deterministic pseudo-random numbers so every reset produces the same data.
let seed = 20261122;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const DAY = 86_400_000;

const TEAM = [
  { email: demoEmail, name: "Alex Morgan", role: "owner" as const, password: demoPassword },
  { email: "jordan.lee@example.com", name: "Jordan Lee", role: "admin" as const },
  { email: "sam.rivera@example.com", name: "Sam Rivera", role: "rep" as const },
  { email: "priya.nair@example.com", name: "Priya Nair", role: "rep" as const },
];

const FIRST = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Mia", "Lucas", "Sofia", "Mason", "Isla", "Leo", "Grace", "Henry", "Chloe", "Daniel", "Zara", "Owen", "Ruby", "Caleb"];
const LAST = ["Bennett", "Hughes", "Patel", "Okafor", "Kowalski", "Fischer", "Nakamura", "Duarte", "Larsen", "Moreau", "Haddad", "Quinn", "Romero", "Sato", "Walsh", "Ibrahim"];
const COMPANY_A = ["Northwind", "Bluepeak", "Cedar", "Harbor", "Summit", "Lumen", "Ironwood", "Brightside", "Oakridge", "Silverline", "Maple", "Redstone", "Clearwater", "Pinecrest", "Riverbend"];
const COMPANY_B = ["Dental", "Roofing", "Physio", "Law Group", "Landscaping", "Fitness", "Plumbing", "Realty", "Veterinary", "Accounting", "Bakery", "Auto Care", "Interiors", "Clinic", "Electric"];
const SOURCES = ["website", "website", "website", "referral", "referral", "linkedin", "ads", "ads", "other"] as const;
const TAGS = ["hot", "retainer", "website-redesign", "seo", "ads-management", "follow-up", "budget-approved", "small"];
const NOTES = [
  "Wants a quote for a full website redesign before their spring launch.",
  "Asked about monthly SEO packages. Currently working with another agency but unhappy.",
  "Needs help with Google Ads. Spending about $3k/month with poor results.",
  "Referred by an existing client. Decision maker is the practice owner.",
  "Interested in a booking system integration for their website.",
  "Small budget for now, but could grow into a retainer later this year.",
];
const CALL_NOTES = [
  "Intro call. They want to see two similar case studies before the proposal.",
  "Walked through pricing. They're comparing us with one other agency.",
  "Left a voicemail, will try again Thursday.",
  "Good call with the owner. Budget confirmed, wants to start next month.",
];
const EMAIL_NOTES = [
  "Sent the proposal PDF and a link to book a review call.",
  "Followed up on the proposal; they asked for a phased option.",
  "Shared the onboarding checklist.",
];
const TASKS = ["Call back about the proposal", "Send revised quote", "Check in after their board meeting", "Book a discovery call", "Share case studies", "Confirm start date"];

async function ensureUser(email: string, name: string, password?: string) {
  const { data: list, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  const pw = password ?? randomBytes(24).toString("base64url");
  if (existing) {
    if (password) await db.auth.admin.updateUserById(existing.id, { password: pw });
    return existing.id;
  }
  const { data, error: createError } = await db.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (createError) throw createError;
  return data.user.id;
}

async function main() {
  // 1. Remove the previous demo workspace (cascades to all of its data).
  const { error: delError } = await db.from("workspaces").delete().eq("is_demo", true);
  if (delError) throw delError;

  // 2. Users.
  const team = [];
  for (const m of TEAM) team.push({ ...m, id: await ensureUser(m.email, m.name, m.password) });
  const owner = team[0]!;

  // 3. Workspace, members, stages.
  const { data: ws, error: wsError } = await db
    .from("workspaces")
    .insert({ name: "Brightline Agency (Demo)", is_demo: true, created_by: owner.id })
    .select("id")
    .single();
  if (wsError) throw wsError;

  const { error: memberError } = await db.from("workspace_members").insert(
    team.map((m) => ({ workspace_id: ws.id, user_id: m.id, role: m.role, display_name: m.name, email: m.email })),
  );
  if (memberError) throw memberError;

  const stageDefs = [
    { name: "New", kind: "open" },
    { name: "Contacted", kind: "open" },
    { name: "Qualified", kind: "open" },
    { name: "Proposal Sent", kind: "open" },
    { name: "Won", kind: "won" },
    { name: "Lost", kind: "lost" },
  ] as const;
  const { data: stages, error: stageError } = await db
    .from("pipeline_stages")
    .insert(stageDefs.map((s, i) => ({ workspace_id: ws.id, name: s.name, position: i, kind: s.kind })))
    .select("id, name, position");
  if (stageError) throw stageError;
  stages.sort((a, b) => a.position - b.position);

  // 4. Leads, weighted towards the early stages.
  const stageWeights = [14, 12, 10, 9, 9, 6];
  const now = Date.now();
  const leads = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < 60; i++) {
    let name = `${pick(FIRST)} ${pick(LAST)}`;
    while (usedNames.has(name)) name = `${pick(FIRST)} ${pick(LAST)}`;
    usedNames.add(name);
    const company = `${pick(COMPANY_A)} ${pick(COMPANY_B)}`;
    let r = rand() * stageWeights.reduce((a, b) => a + b, 0);
    let stageIdx = 0;
    while (r > stageWeights[stageIdx]!) r -= stageWeights[stageIdx++]!;
    const assignee = i % 9 === 0 ? null : team[1 + (i % 3)]!.id;
    const createdAt = new Date(now - Math.floor(rand() * 85 * DAY) - DAY);
    leads.push({
      workspace_id: ws.id,
      name,
      company,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      phone: `+1 555 01${String(10 + i).padStart(2, "0")}`,
      source: pick(SOURCES),
      value_cents: Math.round((1500 + rand() * 23500) / 100) * 100 * 100,
      stage_id: stages[stageIdx]!.id,
      assigned_to: assignee,
      tags: rand() > 0.5 ? [pick(TAGS)] : rand() > 0.6 ? [pick(TAGS), pick(TAGS)].filter((t, j, a) => a.indexOf(t) === j) : [],
      notes: pick(NOTES),
      created_by: owner.id,
      created_at: createdAt.toISOString(),
      updated_at: new Date(createdAt.getTime() + rand() * (now - createdAt.getTime())).toISOString(),
    });
  }
  const { data: inserted, error: leadError } = await db.from("leads").insert(leads).select("id, stage_id, assigned_to, created_at");
  if (leadError) throw leadError;

  // The insert trigger logged "created" with no actor; attribute it to the owner and backdate it.
  for (const l of inserted) {
    await db.from("activities").update({ actor_id: owner.id, created_at: l.created_at }).eq("lead_id", l.id).eq("type", "created");
  }

  // 5. Timeline entries and follow-ups.
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const stagePos = new Map(stages.map((s) => [s.id, s.position]));
  const activities = [];
  const followUps = [];
  for (const l of inserted) {
    const actor = l.assigned_to ?? owner.id;
    const start = new Date(l.created_at).getTime();
    const span = now - start;
    const pos = stagePos.get(l.stage_id)!;
    // Stage history: open and won leads walked through each stage in order;
    // lost leads dropped out after being contacted.
    const path =
      stageName.get(l.stage_id) === "Lost"
        ? ["New", "Contacted", "Lost"]
        : stages.slice(0, pos + 1).map((s) => s.name);
    for (let p = 1; p < path.length; p++) {
      activities.push({
        workspace_id: ws.id,
        lead_id: l.id,
        actor_id: actor,
        type: "stage_change",
        meta: { from: path[p - 1], to: path[p] },
        created_at: new Date(start + (span * p) / (path.length + 1)).toISOString(),
      });
    }
    const extra = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < extra; k++) {
      const type = pick(["note", "call", "call", "email"] as const);
      activities.push({
        workspace_id: ws.id,
        lead_id: l.id,
        actor_id: actor,
        type,
        body: type === "call" ? pick(CALL_NOTES) : type === "email" ? pick(EMAIL_NOTES) : pick(NOTES),
        created_at: new Date(start + span * rand()).toISOString(),
      });
    }
    if (pos < 4 && rand() > 0.35) {
      // Mix of overdue, due today and upcoming follow-ups.
      const offsetDays = Math.floor(rand() * 10) - 3;
      followUps.push({
        workspace_id: ws.id,
        lead_id: l.id,
        assigned_to: l.assigned_to ?? owner.id,
        task: pick(TASKS),
        due_at: new Date(now + offsetDays * DAY + Math.floor(rand() * 8) * 3_600_000).toISOString(),
        created_by: owner.id,
      });
    }
  }
  // Make sure the demo user has something on their Today page.
  for (const [i, l] of inserted.slice(0, 4).entries()) {
    followUps.push({
      workspace_id: ws.id,
      lead_id: l.id,
      assigned_to: owner.id,
      task: TASKS[i]!,
      due_at: new Date(now + (i - 1) * 6 * 3_600_000).toISOString(),
      created_by: owner.id,
    });
  }

  const { error: actError } = await db.from("activities").insert(activities);
  if (actError) throw actError;
  const { error: fuError } = await db.from("follow_ups").insert(followUps);
  if (fuError) throw fuError;

  console.log(
    `Demo workspace ready: ${inserted.length} leads, ${activities.length} activities, ${followUps.length} follow-ups.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
