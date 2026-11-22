/**
 * Database policy tests that need no Supabase project or secrets.
 *
 * Applies every migration to PGlite (Postgres compiled to WebAssembly) with a
 * minimal stand-in for Supabase's auth schema and roles, then checks the RLS
 * rules by acting as different users. Runs in CI on every pull request.
 * tests/rls.test.ts runs the same kind of checks against a real Supabase project.
 *
 *   npm run test:db
 */
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`);

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(file, migrationsDir), "utf8"));
  console.log("✓ applied", file);
}

const U = {
  ownerA: "00000000-0000-0000-0000-00000000000a",
  rep1: "00000000-0000-0000-0000-0000000000a1",
  rep2: "00000000-0000-0000-0000-0000000000a2",
  ownerB: "00000000-0000-0000-0000-00000000000b",
  outsider: "00000000-0000-0000-0000-0000000000ff",
};
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${k}@example.com`]);
}

async function as(user, sql, params = []) {
  await db.exec("begin");
  try {
    if (user === "anon") await db.exec("set local role anon");
    else if (user === "service") await db.exec("set local role service_role");
    else {
      await db.exec("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[user]]);
    }
    const res = await db.query(sql, params);
    await db.exec("commit");
    return { rows: res.rows, error: null };
  } catch (e) {
    await db.exec("rollback");
    return { rows: [], error: e.message };
  }
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log("✓", name);
  else {
    failures++;
    console.log("✗", name, detail ?? "");
  }
}

// Setup
const wsA = (await as("ownerA", "select public.create_workspace('A', 'Owner A') as id")).rows[0]?.id;
const wsB = (await as("ownerB", "select public.create_workspace('B', 'Owner B') as id")).rows[0]?.id;
check("create_workspace works", wsA && wsB);

for (const rep of ["rep1", "rep2"]) {
  const inv = await as(
    "ownerA",
    "insert into public.invitations (workspace_id, email, role, invited_by) values ($1, $2, 'rep', $3) returning token",
    [wsA, `${rep}@example.com`, U.ownerA],
  );
  check(`invite ${rep}`, !inv.error, inv.error);
  const acc = await as(rep, "select public.accept_invitation($1, $2)", [inv.rows[0]?.token, rep]);
  check(`accept ${rep}`, !acc.error, acc.error);
}

const stageA = (await as("ownerA", "select id from public.pipeline_stages where workspace_id = $1 order by position limit 1", [wsA])).rows[0].id;
const stageB = (await as("ownerB", "select id from public.pipeline_stages where workspace_id = $1 order by position limit 1", [wsB])).rows[0].id;
const wonA = (await as("ownerA", "select id from public.pipeline_stages where workspace_id = $1 and kind = 'won'", [wsA])).rows[0].id;

const leads = await as(
  "ownerA",
  `insert into public.leads (workspace_id, name, stage_id, assigned_to, created_by, value_cents) values
     ($1, 'L1', $2, $3, $5, 1000), ($1, 'L2', $2, $4, $5, 2000), ($1, 'L3', $2, null, $5, 3000)
   returning id, name`,
  [wsA, stageA, U.rep1, U.rep2, U.ownerA],
);
check("owner creates leads", !leads.error, leads.error);
const L = Object.fromEntries(leads.rows.map((r) => [r.name, r.id]));

// Isolation
check("ownerB sees no A leads", (await as("ownerB", "select id from public.leads where workspace_id = $1", [wsA])).rows.length === 0);
check("outsider sees no leads", (await as("outsider", "select id from public.leads")).rows.length === 0);
check("outsider sees no workspaces", (await as("outsider", "select id from public.workspaces")).rows.length === 0);
check(
  "ownerB cannot insert into A",
  !!(await as("ownerB", "insert into public.leads (workspace_id, name, stage_id, created_by) values ($1, 'x', $2, $3)", [wsA, stageA, U.ownerB])).error,
);
const upd = await as("ownerB", "update public.leads set name = 'hacked' where id = $1 returning id", [L.L1]);
check("ownerB cannot update A lead", upd.rows.length === 0);
check(
  "cannot point lead at another workspace's stage",
  !!(await as("ownerA", "update public.leads set stage_id = $1 where id = $2", [stageB, L.L3])).error,
);
check(
  "cannot assign to non-member",
  !!(await as("ownerA", "update public.leads set assigned_to = $1 where id = $2", [U.ownerB, L.L3])).error,
);

// Roles
const repLeads = await as("rep1", "select name from public.leads where workspace_id = $1", [wsA]);
check("rep1 sees only L1", JSON.stringify(repLeads.rows.map((r) => r.name)) === '["L1"]', JSON.stringify(repLeads));
check("rep1 cannot see L2 activities", (await as("rep1", "select id from public.activities where lead_id = $1", [L.L2])).rows.length === 0);
const reassign = await as("rep1", "update public.leads set assigned_to = $1 where id = $2 returning id", [U.rep2, L.L1]);
check("rep1 cannot reassign", !!reassign.error || reassign.rows.length === 0, JSON.stringify(reassign));
const repMove = await as("rep1", "update public.leads set stage_id = $1 where id = $2 returning id", [wonA, L.L1]);
check("rep1 can move own lead", repMove.rows.length === 1, repMove.error);
check("rep1 cannot delete", (await as("rep1", "delete from public.leads where id = $1 returning id", [L.L1])).rows.length === 0);
check("rep1 cannot read invitations", (await as("rep1", "select id from public.invitations")).rows.length === 0);
check("rep1 cannot set roles", /not allowed/.test((await as("rep1", "select public.set_member_role($1, $2, 'admin')", [wsA, U.rep2])).error ?? ""));
check("cannot grant owner", !!(await as("ownerA", "select public.set_member_role($1, $2, 'owner')", [wsA, U.rep1])).error);
check("owner cannot remove self", !!(await as("ownerA", "select public.remove_member($1, $2)", [wsA, U.ownerA])).error);

const stats = await as("rep1", "select * from public.lead_stats($1)", [wsA]);
check("lead_stats for rep counts 1", !stats.error && stats.rows.reduce((s, r) => s + Number(r.lead_count), 0) === 1, stats.error ?? JSON.stringify(stats.rows));
const ownerStats = await as("ownerA", "select * from public.lead_stats($1)", [wsA]);
check("lead_stats for owner counts 3", ownerStats.rows.reduce((s, r) => s + Number(r.lead_count), 0) === 3);
const board = await as("rep1", "select * from public.workspace_leaderboard($1)", [wsA]);
check("leaderboard works for rep", !board.error && board.rows.length === 3, board.error ?? JSON.stringify(board.rows));
check("leaderboard ranks rep1 first (won L1)", board.rows[0]?.user_id === U.rep1, JSON.stringify(board.rows));
check("leaderboard denied to outsider", !!(await as("outsider", "select * from public.workspace_leaderboard($1)", [wsA])).error);

// Columns and functions
check("cannot update created_by", /permission denied/.test((await as("ownerA", "update public.leads set created_by = $1 where id = $2", [U.ownerB, L.L3])).error ?? ""));
check("cannot update is_demo", /permission denied/.test((await as("ownerA", "update public.workspaces set is_demo = true where id = $1", [wsA])).error ?? ""));
check("cannot update form_token", /permission denied/.test((await as("ownerA", "update public.workspaces set form_token = 'x' where id = $1", [wsA])).error ?? ""));
check("manager can rename workspace", (await as("ownerA", "update public.workspaces set name = 'A2' where id = $1 returning id", [wsA])).rows.length === 1);
check("rep cannot rename workspace", (await as("rep1", "update public.workspaces set name = 'x' where id = $1 returning id", [wsA])).rows.length === 0);
check("timeline is append-only", (await as("ownerA", "delete from public.activities where lead_id = $1 returning id", [L.L1])).rows.length === 0);
check(
  "cannot forge stage_change activity",
  !!(await as("ownerA", "insert into public.activities (workspace_id, lead_id, actor_id, type) values ($1, $2, $3, 'stage_change')", [wsA, L.L1, U.ownerA])).error,
);
const note = await as("rep1", "insert into public.activities (workspace_id, lead_id, actor_id, type, body) values ($1, $2, $3, 'note', 'hi') returning id", [wsA, L.L1, U.rep1]);
check("rep can add note to own lead", !note.error, note.error);
check(
  "rep cannot add note to other's lead",
  !!(await as("rep1", "insert into public.activities (workspace_id, lead_id, actor_id, type, body) values ($1, $2, $3, 'note', 'hi')", [wsA, L.L2, U.rep1])).error,
);
check("authenticated cannot call submit_lead_form", !!(await as("ownerA", "select public.submit_lead_form('x','x','x','','','','x')")).error);
check("anon cannot read leads", (await as("anon", "select id from public.leads")).error !== null);

const activities = await as("ownerA", "select type, meta from public.activities where lead_id = $1 order by id", [L.L1]);
check(
  "triggers logged created + stage_change",
  activities.rows.map((r) => r.type).join(",") === "created,stage_change,note",
  JSON.stringify(activities.rows),
);

// Follow-ups
const fu = await as("rep1", "insert into public.follow_ups (workspace_id, lead_id, assigned_to, task, due_at) values ($1, $2, $3, 'call', now()) returning id", [wsA, L.L1, U.rep1]);
check("rep schedules own follow-up", !fu.error, fu.error);
check(
  "rep cannot follow up other's lead",
  !!(await as("rep1", "insert into public.follow_ups (workspace_id, lead_id, assigned_to, task, due_at) values ($1, $2, $3, 'call', now())", [wsA, L.L2, U.rep1])).error,
);
const moveFu = await as("rep1", "update public.follow_ups set lead_id = $1 where id = $2", [L.L2, fu.rows[0]?.id]);
check("rep cannot move follow-up to other lead (no column grant)", !!moveFu.error, JSON.stringify(moveFu));

// Invitations
const inv2 = await as("ownerA", "insert into public.invitations (workspace_id, email, role, invited_by) values ($1, 'someone@example.com', 'admin', $2) returning token", [wsA, U.ownerA]);
check("invite email must match", /different email/.test((await as("outsider", "select public.accept_invitation($1, 'x')", [inv2.rows[0].token])).error ?? ""));
check("cannot invite as owner", !!(await as("ownerA", "insert into public.invitations (workspace_id, email, role, invited_by) values ($1, 'z@example.com', 'owner', $2)", [wsA, U.ownerA])).error);

// Public form
const token = (await as("ownerB", "select form_token from public.workspaces where id = $1", [wsB])).rows[0].form_token;
let lastErr = null;
for (let i = 0; i < 6; i++) {
  lastErr = (await as("service", "select public.submit_lead_form($1, 'Visitor', 'v@example.com', '', '', 'hello', 'iphash')", [token])).error;
  if (i < 5) check(`form submission ${i + 1} ok`, !lastErr, lastErr);
}
check("6th submission rate limited", /rate_limited/.test(lastErr ?? ""), lastErr);
const formLeads = await as("ownerB", "select source, stage_id from public.leads where workspace_id = $1", [wsB]);
check("form leads in first stage, source website", formLeads.rows.length === 5 && formLeads.rows.every((r) => r.source === "website" && r.stage_id === stageB));
const regen = await as("ownerB", "select public.regenerate_form_token($1) as t", [wsB]);
check("regenerate_form_token", !regen.error && regen.rows[0].t !== token, regen.error);

// Stage deletion with leads is blocked by FK
check("cannot delete stage that has leads", !!(await as("ownerA", "delete from public.pipeline_stages where id = $1", [stageA])).error);

// Member removal unassigns leads
const rm = await as("ownerA", "select public.remove_member($1, $2)", [wsA, U.rep2]);
check("owner removes rep2", !rm.error, rm.error);
const l2 = await as("ownerA", "select assigned_to from public.leads where id = $1", [L.L2]);
check("rep2's lead becomes unassigned", l2.rows[0]?.assigned_to === null, JSON.stringify(l2));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures ? 1 : 0);
