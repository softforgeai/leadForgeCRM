import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, Trophy, UserPlus, Wallet } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { getOrganization } from "@/lib/admin-data";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { PRIORITY_LABEL, PRIORITY_TONE, STAFF_STATUS_LABEL, STATUS_TONE, isOpenStatus, ticketRef } from "@/lib/support";
import { LoginAsButton } from "../../AdminForms";
import { StatCard, TONES } from "../../ui";

export const metadata = { title: "Organization" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

const ACTIVITY_LABEL: Record<string, string> = {
  created: "Lead created",
  note: "Note",
  call: "Call logged",
  email: "Email logged",
  stage_change: "Stage changed",
  assigned: "Reassigned",
  follow_up: "Follow-up",
};

export default async function OrganizationPage({ params }: PageProps<"/admin/organizations/[id]">) {
  const { id } = await params;
  const org = await getOrganization(id);
  if (!org) notFound();
  const { workspace, totals } = org;
  const winRate = totals.wonCount + totals.lostCount === 0 ? null : totals.wonCount / (totals.wonCount + totals.lostCount);
  const maxStage = Math.max(1, ...org.stages.map((s) => s.count));
  const openTickets = org.tickets.filter((t) => isOpenStatus(t.status));

  return (
    <div className="space-y-6">
      <Link href="/admin/organizations" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Organizations
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            {workspace.name}
            {workspace.is_demo && <Badge tone="warning">Demo</Badge>}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Joined {formatDate(workspace.created_at)} · <span className="font-mono text-xs">{workspace.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/admin/users?workspace=${workspace.id}`} className="text-accent-text hover:underline">
            All users in this organization
          </Link>
          <Link href={`/admin/support?workspace=${workspace.id}&status=all`} className="text-accent-text hover:underline">
            All tickets from this organization
          </Link>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open pipeline" value={formatMoney(totals.openValue)} icon={Wallet} tone={TONES.sky} />
        <StatCard label="Won revenue" value={formatMoney(totals.wonValue)} hint={`${totals.wonCount} deals`} icon={Trophy} tone={TONES.emerald} />
        <StatCard
          label="Win rate"
          value={winRate === null ? "—" : `${Math.round(winRate * 100)}%`}
          hint="Won ÷ (won + lost)"
          icon={Target}
          tone={TONES.violet}
        />
        <StatCard label="Leads" value={totals.leads} hint={`${totals.newThisMonth} new this month`} icon={UserPlus} tone={TONES.amber} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Members</h2>
            <p className="text-sm text-muted">Log in as a member to see the app exactly as they do, for example to reproduce a reported issue.</p>
          </div>
          <ul className="divide-y divide-line">
            {org.members.map((m) => (
              <li key={m.user_id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.display_name} className="size-9 text-xs" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <Link href={`/admin/users/${m.user_id}`} className="hover:text-accent-text hover:underline">
                        {m.display_name}
                      </Link>
                      <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                      {m.isPlatformAdmin && <Badge tone="warning">Staff</Badge>}
                    </p>
                    <p className="truncate text-xs text-subtle">
                      {m.email} · {m.lastSignInAt ? `signed in ${formatRelative(m.lastSignInAt)}` : "never signed in"}
                    </p>
                  </div>
                </div>
                <LoginAsButton
                  userId={m.user_id}
                  workspaceId={workspace.id}
                  name={m.display_name}
                  disabledReason={m.isPlatformAdmin ? "Platform admins can't be impersonated." : undefined}
                />
              </li>
            ))}
          </ul>
          {org.pendingInvites.length > 0 && (
            <p className="border-t border-line px-5 py-3 text-xs text-subtle">
              Pending invitations: {org.pendingInvites.map((i) => `${i.email} (${ROLE_LABEL[i.role]})`).join(", ")}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Pipeline</h2>
          <ul className="mt-4 space-y-3">
            {org.stages.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted tabular-nums">
                    {s.count} · {formatMoney(s.value)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${s.kind === "won" ? "bg-success" : s.kind === "lost" ? "bg-subtle" : "bg-accent/70"}`}
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">
            Support tickets <span className="font-normal text-subtle">({openTickets.length} open)</span>
          </h2>
          {org.tickets.length === 0 ? (
            <p className="mt-3 text-sm text-muted">This organization hasn&apos;t contacted support.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {org.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/support/${t.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-accent-text">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.subject}</p>
                      <p className="text-xs text-subtle">
                        {ticketRef(t.number)} · {t.created_by_name} · {formatRelative(t.last_message_at)}
                      </p>
                    </div>
                    {t.priority !== "normal" && t.priority !== "low" && (
                      <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    )}
                    <Badge tone={STATUS_TONE[t.status]}>{STAFF_STATUS_LABEL[t.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Recent activity</h2>
          {org.activities.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5 text-sm">
              {org.activities.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{ACTIVITY_LABEL[a.type] ?? a.type}</span>
                    {a.lead && <span className="text-muted"> · {a.lead.name}</span>}
                    {a.actorName && <span className="text-subtle"> by {a.actorName}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-subtle">{formatRelative(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">Staff actions on this organization</h2>
        {org.auditLog.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No staff actions recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {org.auditLog.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>
                  <span className="font-mono text-xs">{e.action}</span> <span className="text-muted">by {e.actor_email}</span>
                  {typeof e.details === "object" && e.details && !Array.isArray(e.details) && typeof e.details.reason === "string" && (
                    <span className="text-subtle"> · “{e.details.reason}”</span>
                  )}
                </span>
                <span className="text-xs text-subtle">{formatDate(e.created_at, { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
