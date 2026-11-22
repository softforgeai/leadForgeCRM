/**
 * Database security tests. These run against a real Supabase project and
 * prove the guarantees in the migration: workspace isolation, role rules,
 * column restrictions, and locked-down functions.
 *
 *   npm run test:rls      (needs .env.local with Supabase credentials)
 *
 * The suite creates throwaway users and workspaces and deletes them after.
 * Use a development or staging project, not production.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const enabled = Boolean(url && anonKey && secretKey);

type Client = SupabaseClient<Database>;
type TestUser = { id: string; email: string; client: Client };

const run = randomBytes(4).toString("hex");
const admin = enabled
  ? createClient<Database>(url!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } })
  : (null as unknown as Client);
const createdUsers: string[] = [];
const createdWorkspaces: string[] = [];

async function makeUser(label: string): Promise<TestUser> {
  const email = `rls-${run}-${label}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

describe.skipIf(!enabled)("row-level security", () => {
  let ownerA: TestUser, repA1: TestUser, repA2: TestUser, ownerB: TestUser, outsider: TestUser;
  let wsA: string, wsB: string;
  let stageA: string, stageB: string;
  let leadRep1: string, leadRep2: string, leadUnassigned: string;

  beforeAll(async () => {
    [ownerA, repA1, repA2, ownerB, outsider] = await Promise.all(
      ["owner-a", "rep-a1", "rep-a2", "owner-b", "outsider"].map(makeUser),
    );

    const a = await ownerA.client.rpc("create_workspace", { p_name: "RLS A", p_display_name: "Owner A" });
    const b = await ownerB.client.rpc("create_workspace", { p_name: "RLS B", p_display_name: "Owner B" });
    if (a.error || b.error) throw a.error ?? b.error;
    wsA = a.data!;
    wsB = b.data!;
    createdWorkspaces.push(wsA, wsB);

    for (const rep of [repA1, repA2]) {
      const { data: inv, error } = await ownerA.client
        .from("invitations")
        .insert({ workspace_id: wsA, email: rep.email, role: "rep", invited_by: ownerA.id })
        .select("token")
        .single();
      if (error) throw error;
      const accepted = await rep.client.rpc("accept_invitation", { p_token: inv.token, p_display_name: rep.email });
      if (accepted.error) throw accepted.error;
    }

    const stagesA = await ownerA.client.from("pipeline_stages").select("id").eq("workspace_id", wsA).order("position");
    const stagesB = await ownerB.client.from("pipeline_stages").select("id").eq("workspace_id", wsB).order("position");
    stageA = stagesA.data![0]!.id;
    stageB = stagesB.data![0]!.id;

    const { data: leads, error } = await ownerA.client
      .from("leads")
      .insert([
        { workspace_id: wsA, name: "Rep1 lead", stage_id: stageA, assigned_to: repA1.id, created_by: ownerA.id },
        { workspace_id: wsA, name: "Rep2 lead", stage_id: stageA, assigned_to: repA2.id, created_by: ownerA.id },
        { workspace_id: wsA, name: "Unassigned lead", stage_id: stageA, assigned_to: null, created_by: ownerA.id },
      ])
      .select("id, name");
    if (error) throw error;
    leadRep1 = leads.find((l) => l.name === "Rep1 lead")!.id;
    leadRep2 = leads.find((l) => l.name === "Rep2 lead")!.id;
    leadUnassigned = leads.find((l) => l.name === "Unassigned lead")!.id;
  }, 60_000);

  afterAll(async () => {
    if (createdWorkspaces.length) await admin.from("workspaces").delete().in("id", createdWorkspaces);
    await Promise.all(createdUsers.map((id) => admin.auth.admin.deleteUser(id)));
  }, 60_000);

  describe("workspace isolation", () => {
    it("another workspace's owner cannot read its leads, members or stages", async () => {
      const leads = await ownerB.client.from("leads").select("id").eq("workspace_id", wsA);
      const members = await ownerB.client.from("workspace_members").select("user_id").eq("workspace_id", wsA);
      const stages = await ownerB.client.from("pipeline_stages").select("id").eq("workspace_id", wsA);
      expect(leads.data).toEqual([]);
      expect(members.data).toEqual([]);
      expect(stages.data).toEqual([]);
    });

    it("a user with no workspace sees nothing at all", async () => {
      const { data } = await outsider.client.from("leads").select("id");
      expect(data).toEqual([]);
    });

    it("cannot insert a lead into another workspace", async () => {
      const { error } = await ownerB.client
        .from("leads")
        .insert({ workspace_id: wsA, name: "Injected", stage_id: stageA, created_by: ownerB.id });
      expect(error).not.toBeNull();
    });

    it("cannot update or delete another workspace's lead", async () => {
      const upd = await ownerB.client.from("leads").update({ name: "Hacked" }).eq("id", leadRep1).select("id");
      const del = await ownerB.client.from("leads").delete().eq("id", leadRep1).select("id");
      expect(upd.data ?? []).toEqual([]);
      expect(del.data ?? []).toEqual([]);
      const check = await ownerA.client.from("leads").select("name").eq("id", leadRep1).single();
      expect(check.data?.name).toBe("Rep1 lead");
    });

    it("cannot point a lead at another workspace's stage", async () => {
      const { error } = await ownerA.client.from("leads").update({ stage_id: stageB }).eq("id", leadUnassigned);
      expect(error).not.toBeNull();
    });

    it("cannot assign a lead to someone outside the workspace", async () => {
      const { error } = await ownerA.client.from("leads").update({ assigned_to: ownerB.id }).eq("id", leadUnassigned);
      expect(error).not.toBeNull();
    });
  });

  describe("roles", () => {
    it("a sales rep only sees leads assigned to them", async () => {
      const { data } = await repA1.client.from("leads").select("id").eq("workspace_id", wsA);
      expect(data?.map((l) => l.id)).toEqual([leadRep1]);
    });

    it("a sales rep cannot see another rep's activity timeline", async () => {
      const { data } = await repA1.client.from("activities").select("id").eq("lead_id", leadRep2);
      expect(data).toEqual([]);
    });

    it("a sales rep cannot reassign their lead to someone else", async () => {
      const { error, data } = await repA1.client
        .from("leads")
        .update({ assigned_to: repA2.id })
        .eq("id", leadRep1)
        .select("id");
      expect(error !== null || (data ?? []).length === 0).toBe(true);
      const check = await ownerA.client.from("leads").select("assigned_to").eq("id", leadRep1).single();
      expect(check.data?.assigned_to).toBe(repA1.id);
    });

    it("a sales rep cannot delete leads", async () => {
      const { data } = await repA1.client.from("leads").delete().eq("id", leadRep1).select("id");
      expect(data ?? []).toEqual([]);
    });

    it("a sales rep cannot read invitations or change roles", async () => {
      const inv = await repA1.client.from("invitations").select("id").eq("workspace_id", wsA);
      expect(inv.data).toEqual([]);
      const role = await repA1.client.rpc("set_member_role", { p_workspace: wsA, p_user: repA2.id, p_role: "admin" });
      expect(role.error?.message).toMatch(/not allowed/);
    });

    it("dashboard stats for a rep include only their own leads", async () => {
      const { data } = await repA1.client.rpc("lead_stats", { p_workspace: wsA });
      const total = (data ?? []).reduce((sum, r) => sum + Number(r.lead_count), 0);
      expect(total).toBe(1);
    });

    it("nobody can grant the owner role", async () => {
      const { error } = await ownerA.client.rpc("set_member_role", { p_workspace: wsA, p_user: repA1.id, p_role: "owner" });
      expect(error).not.toBeNull();
    });

    it("the owner cannot be removed", async () => {
      // Promote rep2 to admin, then have them try to remove the owner.
      await ownerA.client.rpc("set_member_role", { p_workspace: wsA, p_user: repA2.id, p_role: "admin" });
      const { error } = await repA2.client.rpc("remove_member", { p_workspace: wsA, p_user: ownerA.id });
      expect(error?.message).toMatch(/owner cannot be removed/);
      await ownerA.client.rpc("set_member_role", { p_workspace: wsA, p_user: repA2.id, p_role: "rep" });
    });
  });

  describe("protected columns and functions", () => {
    it("users cannot change a lead's created_by", async () => {
      const { error } = await ownerA.client
        .from("leads")
        .update({ created_by: ownerB.id } as never)
        .eq("id", leadUnassigned);
      expect(error?.code).toBe("42501");
    });

    it("managers cannot change is_demo or the form token directly", async () => {
      const demo = await ownerA.client.from("workspaces").update({ is_demo: true } as never).eq("id", wsA);
      const token = await ownerA.client.from("workspaces").update({ form_token: "x".repeat(32) } as never).eq("id", wsA);
      expect(demo.error?.code).toBe("42501");
      expect(token.error?.code).toBe("42501");
    });

    it("the timeline is append-only", async () => {
      const { data: act } = await ownerA.client.from("activities").select("id").eq("lead_id", leadRep1).limit(1).single();
      const del = await ownerA.client.from("activities").delete().eq("id", act!.id).select("id");
      expect(del.data ?? []).toEqual([]);
    });

    it("users cannot forge automatic timeline entries", async () => {
      const { error } = await ownerA.client.from("activities").insert({
        workspace_id: wsA,
        lead_id: leadRep1,
        actor_id: ownerA.id,
        type: "stage_change",
        meta: { from: "x", to: "y" },
      });
      expect(error).not.toBeNull();
    });

    it("signed-in users cannot call the public-form function directly", async () => {
      const { error } = await ownerA.client.rpc("submit_lead_form", {
        p_token: "a".repeat(32),
        p_name: "x",
        p_email: "x@example.com",
        p_company: "",
        p_phone: "",
        p_message: "",
        p_ip_hash: "spoofed",
      });
      expect(error).not.toBeNull();
    });

    it("anonymous visitors cannot read any table", async () => {
      const anon = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
      const { data, error } = await anon.from("leads").select("id").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    });
  });

  describe("invitations", () => {
    it("an invitation only works for the email it was sent to", async () => {
      const { data: inv } = await ownerA.client
        .from("invitations")
        .insert({ workspace_id: wsA, email: `someone-else-${run}@example.com`, role: "admin", invited_by: ownerA.id })
        .select("token")
        .single();
      const { error } = await outsider.client.rpc("accept_invitation", { p_token: inv!.token, p_display_name: "Sneaky" });
      expect(error?.message).toMatch(/different email/);
      const members = await ownerA.client.from("workspace_members").select("user_id").eq("user_id", outsider.id);
      expect(members.data).toEqual([]);
    });

    it("unknown invitation tokens are rejected", async () => {
      const { error } = await outsider.client.rpc("accept_invitation", {
        p_token: randomUUID().replace(/-/g, ""),
        p_display_name: "x",
      });
      expect(error?.message).toMatch(/not found or expired/);
    });
  });

  describe("public lead form", () => {
    it("creates a lead in the first stage and rate limits repeat submissions", async () => {
      const { data: ws } = await ownerB.client.from("workspaces").select("form_token").eq("id", wsB).single();
      const submit = () =>
        admin.rpc("submit_lead_form", {
          p_token: ws!.form_token,
          p_name: "Form visitor",
          p_email: "visitor@example.com",
          p_company: "",
          p_phone: "",
          p_message: "Hello",
          p_ip_hash: `test-${run}`,
        });
      for (let i = 0; i < 5; i++) expect((await submit()).error).toBeNull();
      const sixth = await submit();
      expect(sixth.error?.message).toMatch(/rate_limited/);

      const { data: leads } = await ownerB.client.from("leads").select("source, stage_id").eq("workspace_id", wsB);
      expect(leads).toHaveLength(5);
      expect(leads!.every((l) => l.source === "website" && l.stage_id === stageB)).toBe(true);
    });
  });
});
