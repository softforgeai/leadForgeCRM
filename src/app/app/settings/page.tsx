import { Avatar, Badge } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { SettingsSection } from "./SettingsSection";
import { WorkspaceForm } from "./SettingsForms";

export const metadata = { title: "General settings" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

export default async function GeneralSettingsPage() {
  const ctx = await requireWorkspace();
  const canEdit = ctx.isManager && !ctx.workspace.is_demo;

  return (
    <>
      <SettingsSection title="Workspace profile" description="Your company's name and logo, shown to everyone on your team." flush>
        <WorkspaceForm name={ctx.workspace.name} logoUrl={ctx.workspace.logo_url ?? ""} disabled={!canEdit} />
      </SettingsSection>

      <SettingsSection title="Your account" description="How you appear to your teammates in this workspace.">
        <div className="flex items-center gap-4">
          <Avatar name={ctx.member.display_name} className="size-12 text-base" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{ctx.member.display_name}</p>
            <p className="truncate text-sm text-muted">{ctx.member.email}</p>
          </div>
          <Badge tone={ctx.role === "owner" ? "accent" : "neutral"}>{ROLE_LABEL[ctx.role]}</Badge>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtle">Member since</dt>
            <dd className="mt-0.5 font-medium">{formatDate(ctx.member.created_at)}</dd>
          </div>
          <div>
            <dt className="text-subtle">Workspaces you belong to</dt>
            <dd className="mt-0.5 font-medium">{ctx.memberships.length}</dd>
          </div>
        </dl>
      </SettingsSection>
    </>
  );
}
