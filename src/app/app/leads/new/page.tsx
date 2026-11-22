import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/data";
import { LeadForm } from "../LeadForm";

export const metadata = { title: "New lead" };

export default async function NewLeadPage({ searchParams }: PageProps<"/app/leads/new">) {
  const ctx = await requireWorkspace();
  const [stages, members, sp] = await Promise.all([
    getStages(ctx.workspace.id),
    getMembers(ctx.workspace.id),
    searchParams,
  ]);
  // Preselect the stage when coming from a pipeline column's "+" button.
  const requested = typeof sp.stage === "string" ? sp.stage : undefined;
  const defaultStageId = stages.some((s) => s.id === requested) ? requested : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Back to pipeline
      </Link>
      <PageTitle title="New lead" description="Add a contact and the deal you're working on with them." />
      <Card className="p-5 sm:p-6">
        <LeadForm
          stages={stages.map((s) => ({ value: s.id, label: s.name }))}
          members={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
          canAssign={ctx.isManager}
          currentUserId={ctx.userId}
          defaultStageId={defaultStageId}
        />
      </Card>
    </div>
  );
}
