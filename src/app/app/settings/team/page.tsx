import { requireWorkspace } from "@/lib/auth";
import { getMembers } from "@/lib/data";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SettingsSection } from "../SettingsSection";
import { InviteForm, MemberRow, PendingInvite } from "../SettingsForms";

export const metadata = { title: "Team settings" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

export default async function TeamSettingsPage() {
  const ctx = await requireWorkspace();
  const members = await getMembers(ctx.workspace.id);
  const canEdit = ctx.isManager && !ctx.workspace.is_demo;

  let invitations: { id: string; email: string; role: keyof typeof ROLE_LABEL; token: string; expires_at: string }[] = [];
  if (ctx.isManager) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("invitations")
      .select("id, email, role, token, expires_at")
      .eq("workspace_id", ctx.workspace.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    invitations = data ?? [];
  }

  // Owner first, then admins, then reps.
  const order = { owner: 0, admin: 1, rep: 2 } as const;
  const sorted = [...members].sort((a, b) => order[a.role] - order[b.role] || a.display_name.localeCompare(b.display_name));

  return (
    <>
      <SettingsSection
        title="Members"
        description={
          <>
            <p>
              <strong className="font-medium text-fg">Admins</strong> see every deal and manage settings.{" "}
              <strong className="font-medium text-fg">Sales reps</strong> see only the deals assigned to them.
            </p>
            <p className="mt-2">Removing someone unassigns their deals; nothing is deleted.</p>
          </>
        }
        flush
        footer={
          <span className="mr-auto text-xs text-subtle">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        }
      >
        <ul className="divide-y divide-line">
          {sorted.map((m) => (
            <MemberRow
              key={m.user_id}
              userId={m.user_id}
              name={m.display_name}
              email={m.email}
              role={m.role}
              isYou={m.user_id === ctx.userId}
              editable={canEdit && m.role !== "owner" && m.user_id !== ctx.userId}
            />
          ))}
        </ul>
      </SettingsSection>

      {canEdit && (
        <SettingsSection
          title="Invite a teammate"
          description="You'll get a private link to send them. It only works for the email you enter and expires after 7 days."
        >
          <InviteForm />
        </SettingsSection>
      )}

      {ctx.isManager && invitations.length > 0 && (
        <SettingsSection title="Pending invitations" description="Invitations that haven't been accepted yet." flush>
          <ul className="divide-y divide-line">
            {invitations.map((inv) => (
              <PendingInvite
                key={inv.id}
                id={inv.id}
                email={inv.email}
                role={ROLE_LABEL[inv.role]}
                link={`${publicEnv.NEXT_PUBLIC_SITE_URL}/invite/${inv.token}`}
                expires={formatDate(inv.expires_at)}
              />
            ))}
          </ul>
        </SettingsSection>
      )}
    </>
  );
}
