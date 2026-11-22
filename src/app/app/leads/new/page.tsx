import { Card, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/data";
import { LeadForm } from "../LeadForm";

export const metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const ctx = await requireWorkspace();
  const [stages, members] = await Promise.all([getStages(ctx.workspace.id), getMembers(ctx.workspace.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="New lead" />
      <Card className="p-5 sm:p-6">
        <LeadForm
          stages={stages.map((s) => ({ value: s.id, label: s.name }))}
          members={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
          canAssign={ctx.isManager}
          currentUserId={ctx.userId}
        />
      </Card>
    </div>
  );
}
