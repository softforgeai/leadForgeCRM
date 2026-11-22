import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Mail, MessageSquare, Phone } from "lucide-react";
import { deleteLead } from "@/app/app/actions/leads";
import { StagePill } from "@/components/StagePill";
import { Avatar, Card } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getActivities, getLead, getLeadFollowUps, getMembers, getStages } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { FALLBACK_COLOR, stageColors } from "@/lib/stage-colors";
import { SOURCE_LABELS } from "@/lib/validation";
import { LeadForm } from "../LeadForm";
import { ActivityComposer, FollowUpForm, FollowUpList, StagePath, Timeline } from "./LeadPanels";

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
  const colors = stageColors(stages);
  const stage = stages.find((s) => s.id === lead.stage_id);
  const now = await requestTime();
  const names = Object.fromEntries(members.map((m) => [m.user_id, m.display_name]));
  const owner = lead.assigned_to ? names[lead.assigned_to] : undefined;
  const openFollowUps = followUps.filter((f) => !f.completed_at).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/app/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft aria-hidden className="size-4" /> Pipeline
        </Link>
        {ctx.isManager && (
          <form action={deleteLead}>
            <input type="hidden" name="id" value={lead.id} />
            <ConfirmDelete />
          </form>
        )}
      </div>

      <StagePath
        leadId={lead.id}
        currentStageId={lead.stage_id}
        stages={stages.map(({ id, name, kind }) => ({ id, name, kind }))}
      />

      <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
        {/* Contact card */}
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <div className="p-5 text-center">
              <Avatar name={lead.name} className="mx-auto size-16 text-xl" />
              <h1 className="mt-3 text-lg font-semibold tracking-tight">{lead.name}</h1>
              {lead.company && (
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted">
                  <Building2 aria-hidden className="size-3.5" /> {lead.company}
                </p>
              )}
              <div className="mt-3">
                {stage && <StagePill name={stage.name} color={colors.get(stage.id) ?? FALLBACK_COLOR} />}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <ContactAction
                  href={lead.phone ? `tel:${lead.phone.replace(/[^\d+]/g, "")}` : undefined}
                  icon={Phone}
                  label="Call"
                />
                <ContactAction href={lead.email ? `mailto:${lead.email}` : undefined} icon={Mail} label="Email" />
                <ContactAction href="#activity" icon={MessageSquare} label="Note" />
              </div>
            </div>
            <dl className="divide-y divide-line border-t border-line text-sm">
              <Fact label="Deal value" value={<span className="font-semibold">{formatMoney(lead.value_cents)}</span>} />
              <Fact
                label="Owner"
                value={
                  owner ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar name={owner} className="size-5 text-[9px]" /> {owner}
                    </span>
                  ) : (
                    <span className="text-subtle">Unassigned</span>
                  )
                }
              />
              <Fact
                label="Email"
                value={lead.email ? <a href={`mailto:${lead.email}`} className="text-accent-text hover:underline">{lead.email}</a> : "—"}
              />
              <Fact label="Phone" value={lead.phone ?? "—"} />
              <Fact label="Source" value={SOURCE_LABELS[lead.source]} />
              <Fact label="Created" value={formatDate(lead.created_at)} />
              <Fact
                label="Tags"
                value={
                  lead.tags.length ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {lead.tags.map((t) => (
                        <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                          {t}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </Card>

          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-semibold">
                Edit details
                <span aria-hidden className="text-subtle transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <LeadForm
                  lead={lead}
                  stages={stages.map((s) => ({ value: s.id, label: s.name }))}
                  members={members.map((m) => ({ value: m.user_id, label: m.display_name }))}
                  canAssign={ctx.isManager}
                  currentUserId={ctx.userId}
                />
              </div>
            </details>
          </Card>
        </aside>

        {/* Activity */}
        <Card id="activity" className="scroll-mt-4 p-5">
          <h2 className="mb-4 text-sm font-semibold">Activity</h2>
          <ActivityComposer leadId={lead.id} />
          {lead.notes && (
            <div className="mt-5 rounded-lg border border-line bg-surface-2/60 p-3">
              <p className="text-[11px] font-semibold tracking-wider text-subtle uppercase">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
          <Timeline activities={activities} names={names} now={now} />
        </Card>

        {/* Tasks */}
        <Card className="h-fit p-5 lg:col-span-2 xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tasks</h2>
            {openFollowUps > 0 && <span className="text-xs text-muted">{openFollowUps} open</span>}
          </div>
          <FollowUpList followUps={followUps} names={names} now={now} />
          <FollowUpForm
            leadId={lead.id}
            members={ctx.isManager ? members.map((m) => ({ value: m.user_id, label: m.display_name })) : []}
            currentUserId={ctx.userId}
          />
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-2.5">
      <dt className="shrink-0 text-subtle">{label}</dt>
      <dd className="min-w-0 text-right break-words">{value}</dd>
    </div>
  );
}

function ContactAction({ href, icon: Icon, label }: { href?: string; icon: typeof Phone; label: string }) {
  const cls = "flex flex-col items-center gap-1 rounded-lg border border-line py-2 text-xs font-medium";
  if (!href) {
    return (
      <span className={`${cls} cursor-not-allowed text-subtle opacity-50`} title={`No ${label === "Call" ? "phone number" : "email"}`}>
        <Icon aria-hidden className="size-4" /> {label}
      </span>
    );
  }
  return (
    <a href={href} className={`${cls} text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text`}>
      <Icon aria-hidden className="size-4" /> {label}
    </a>
  );
}

/** Current time for this request (kept out of render so it's computed once). */
async function requestTime() {
  return Date.now();
}

function ConfirmDelete() {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-muted hover:text-danger">
        Delete
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
