import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { deleteLead } from "@/app/app/actions/leads";
import { Badge, Card } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getActivities, getLead, getLeadFollowUps, getMembers, getStages } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/validation";
import { LeadForm } from "../LeadForm";
import { ActivityComposer, FollowUpForm, FollowUpList, Timeline } from "./LeadPanels";

export default async function LeadPage({ params }: PageProps<"/app/leads/[id]">) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const lead = await getLead(ctx.workspace.id, id);
  if (!lead) notFound();

  const [stages, members, activities, followUps] = await Promise.all([
    getStages(ctx.workspace.id),
    getMembers(ctx.workspace.id),
    getActivities(lead.id),
    getLeadFollowUps(lead.id),
  ]);
  const stage = stages.find((s) => s.id === lead.stage_id);
  const now = await requestTime();
  const names = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));

  return (
    <div className="space-y-6">
      <Link href="/app/leads" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> All leads
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <Badge tone={stage?.kind === "won" ? "success" : stage?.kind === "lost" ? "neutral" : "accent"}>
              {stage?.name}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {[lead.company, SOURCE_LABELS[lead.source], formatMoney(lead.value_cents)].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-accent-text hover:underline">
                <Mail aria-hidden className="size-4" /> {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-accent-text hover:underline">
                <Phone aria-hidden className="size-4" /> {lead.phone}
              </a>
            )}
          </div>
        </div>
        {ctx.isManager && (
          <form action={deleteLead}>
            <input type="hidden" name="id" value={lead.id} />
            <ConfirmDelete />
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Activity</h2>
            <ActivityComposer leadId={lead.id} />
            <Timeline activities={activities} names={names} now={now} />
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Follow-ups</h2>
            <FollowUpList followUps={followUps} names={names} now={now} />
            <FollowUpForm
              leadId={lead.id}
              members={ctx.isManager ? members.map((m) => ({ value: m.user_id, label: m.display_name })) : []}
              currentUserId={ctx.userId}
            />
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Details</h2>
            <LeadForm
              lead={lead}
              stages={stages.map((s) => ({ value: s.id, label: s.name }))}
              members={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
              canAssign={ctx.isManager}
              currentUserId={ctx.userId}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Current time for this request (kept out of render so it's computed once). */
async function requestTime() {
  return Date.now();
}

function ConfirmDelete() {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-line-strong px-3 py-1.5 text-sm text-muted hover:text-danger">
        Delete lead
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-line bg-surface p-4 shadow-lg">
        <p className="text-sm">Delete this lead and its history? This can&apos;t be undone.</p>
        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Yes, delete it
        </button>
      </div>
    </details>
  );
}
