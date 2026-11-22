import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Member, MemberRoleT, Workspace } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const WORKSPACE_COOKIE = "lf_ws";

/**
 * The signed-in user, verified against Supabase Auth (not just decoded from
 * the cookie). Cached per request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export type WorkspaceContext = {
  userId: string;
  workspace: Workspace;
  role: MemberRoleT;
  isManager: boolean;
  member: Member;
  memberships: { workspace: Workspace; role: MemberRoleT }[];
};

/**
 * Resolves the active workspace for the request. The cookie only *selects*
 * among workspaces the user is already a member of; it grants nothing.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("workspace_members")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  const memberships = (rows ?? []).flatMap((row) =>
    row.workspace ? [{ member: row, workspace: row.workspace as Workspace, role: row.role }] : [],
  );
  if (memberships.length === 0) return null;

  const selectedId = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const active = memberships.find((m) => m.workspace.id === selectedId) ?? memberships[0];

  return {
    userId: user.id,
    workspace: active.workspace,
    role: active.role,
    isManager: active.role === "owner" || active.role === "admin",
    member: active.member,
    memberships: memberships.map(({ workspace, role }) => ({ workspace, role })),
  };
});

export async function requireWorkspace() {
  await requireUser();
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}
