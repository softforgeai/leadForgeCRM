import { Plus } from "lucide-react";
import { ButtonLink, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getBoardLeads, getMembers, getStages } from "@/lib/data";
import { Board } from "./Board";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const ctx = await requireWorkspace();
  const [stages, leads, members] = await Promise.all([
    getStages(ctx.workspace.id),
    getBoardLeads(ctx.workspace.id),
    getMembers(ctx.workspace.id),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Pipeline"
        description="Drag a lead to move it to another stage, or use the stage menu on the card."
        actions={
          <ButtonLink href="/app/leads/new">
            <Plus aria-hidden className="size-4" /> New lead
          </ButtonLink>
        }
      />
      <Board
        stages={stages.map(({ id, name, kind }) => ({ id, name, kind }))}
        leads={leads}
        members={Object.fromEntries(members.map((m) => [m.user_id, m.display_name]))}
      />
    </div>
  );
}
