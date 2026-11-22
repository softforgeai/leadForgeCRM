import { Alert, Badge, Card, PageTitle } from "@/components/ui";
import { ROLE_LABEL } from "@/components/app/Sidebar";
import { requireWorkspace } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/data";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  CopyField,
  InviteForm,
  MemberRow,
  PendingInvite,
  RegenerateFormLink,
  StageEditor,
  WorkspaceForm,
} from "./SettingsForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const [members, stages] = await Promise.all([getMembers(ctx.workspace.id), getStages(ctx.workspace.id)]);

  let invitations: { id: string; email: string; role: "owner" | "admin" | "rep"; token: string; expires_at: string }[] = [];
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

  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  const formUrl = `${site}/f/${ctx.workspace.form_token}`;
  const embed = `<iframe src="${formUrl}?embed=1" title="Contact form" width="100%" height="560" style="border:0"></iframe>`;
  const locked = ctx.workspace.is_demo;
  const canEdit = ctx.isManager && !locked;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Settings" description={ctx.workspace.name} />
      {locked && <Alert tone="warning">Workspace settings are read-only in the demo.</Alert>}
      {!ctx.isManager && <Alert tone="neutral">Only owners and admins can change workspace settings.</Alert>}

      {ctx.isManager && (
        <Section title="Workspace">
          <WorkspaceForm name={ctx.workspace.name} logoUrl={ctx.workspace.logo_url ?? ""} disabled={!canEdit} />
        </Section>
      )}

      {ctx.isManager && (
        <Section
          title="Lead capture form"
          description="Share this link or embed the form on your website. Submissions are added to your first stage."
        >
          <div className="space-y-4">
            <CopyField label="Form link" value={formUrl} />
            <CopyField label="Embed code" value={embed} multiline />
            {canEdit && <RegenerateFormLink />}
          </div>
        </Section>
      )}

      <Section title="Pipeline stages">
        <StageEditor stages={stages.map(({ id, name, kind }) => ({ id, name, kind }))} disabled={!canEdit} />
      </Section>

      <Section title="Team" description={`${members.length} ${members.length === 1 ? "member" : "members"}`}>
        <ul className="divide-y divide-line">
          {members.map((m) =>
            canEdit && m.role !== "owner" && m.user_id !== ctx.userId ? (
              <MemberRow key={m.user_id} userId={m.user_id} name={m.display_name} email={m.email} role={m.role} />
            ) : (
              <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.display_name}
                    {m.user_id === ctx.userId && <span className="ml-1.5 text-xs text-subtle">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
                <Badge>{ROLE_LABEL[m.role]}</Badge>
              </li>
            ),
          )}
        </ul>

        {canEdit && (
          <div className="mt-6 border-t border-line pt-6">
            <h3 className="text-sm font-semibold">Invite a teammate</h3>
            <p className="mt-1 text-sm text-muted">
              You&apos;ll get a link to send them. It works only for the email you enter and expires in 7 days.
            </p>
            <InviteForm />
            {invitations.length > 0 && (
              <ul className="mt-6 space-y-3">
                {invitations.map((inv) => (
                  <PendingInvite
                    key={inv.id}
                    id={inv.id}
                    email={inv.email}
                    role={ROLE_LABEL[inv.role]}
                    link={`${site}/invite/${inv.token}`}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}
