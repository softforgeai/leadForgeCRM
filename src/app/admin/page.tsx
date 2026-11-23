import Link from "next/link";
import { Activity, Building2, Inbox, UserPlus, Users } from "lucide-react";
import { Alert, Badge, Card, PageTitle } from "@/components/ui";
import { getPlatformOverview } from "@/lib/admin-data";
import { formatDate, formatRelative } from "@/lib/format";
import { PRIORITY_LABEL, PRIORITY_TONE, STAFF_STATUS_LABEL, STATUS_TONE, ticketRef } from "@/lib/support";
import { StatCard, TONES, WeeklyBars } from "./ui";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const [{ notice }, data] = await Promise.all([searchParams, getPlatformOverview()]);
  const { stats } = data;

  return (
    <div className="space-y-6">
      <PageTitle title="Platform overview" description="Every organization on LeadForge. Demo data is excluded from the numbers." />

      {notice === "session-expired" && (
        <Alert tone="warning">Your support session expired, so you&apos;ve been switched back to your own account.</Alert>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Organizations"
          value={stats.workspaces}
          hint={`+${stats.workspaces30d} in the last 30 days`}
          icon={Building2}
          tone={TONES.sky}
        />
        <StatCard
          label="Users"
          value={stats.users}
          hint={`+${stats.users30d} in the last 30 days · ${stats.activeUsers7d} signed in this week`}
          icon={Users}
          tone={TONES.violet}
        />
        <StatCard
          label="Active organizations"
          value={stats.activeWorkspaces7d}
          hint="With activity in the last 7 days"
          icon={Activity}
          tone={TONES.emerald}
        />
        <StatCard
          label="Open support tickets"
          value={stats.openTickets}
          hint={`${stats.awaitingReply} awaiting our reply · ${stats.urgentTickets} urgent`}
          icon={Inbox}
          tone={stats.urgentTickets > 0 ? TONES.rose : TONES.amber}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyBars title="New organizations" data={data.weeks.map((w) => ({ weekStart: w.weekStart, value: w.workspaces }))} />
        <WeeklyBars title="New users" data={data.weeks.map((w) => ({ weekStart: w.weekStart, value: w.users }))} />
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Leads tracked" value={stats.leads.toLocaleString("en-US")} hint="Across all organizations" icon={UserPlus} tone={TONES.sky} />
        <StatCard label="Leads added, last 30 days" value={stats.leads30d.toLocaleString("en-US")} icon={UserPlus} tone={TONES.emerald} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Newest organizations</h2>
            <Link href="/admin/organizations" className="text-sm text-accent-text hover:underline">
              View all
            </Link>
          </div>
          {data.recentWorkspaces.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No organizations yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.recentWorkspaces.map((w) => (
                <li key={w.id}>
                  <Link href={`/admin/organizations/${w.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent-text">
                    <span className="truncate font-medium">{w.name}</span>
                    <span className="shrink-0 text-xs text-subtle">{formatDate(w.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Open tickets</h2>
            <Link href="/admin/support" className="text-sm text-accent-text hover:underline">
              Support inbox
            </Link>
          </div>
          {data.recentTickets.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Inbox zero. Nothing open.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.recentTickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/support/${t.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-accent-text">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.subject}</p>
                      <p className="text-xs text-subtle">
                        {ticketRef(t.number)} · {t.workspace?.name ?? "Deleted organization"} · {formatRelative(t.last_message_at)}
                      </p>
                    </div>
                    {(t.priority === "high" || t.priority === "urgent") && (
                      <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    )}
                    <Badge tone={!t.last_message_by_staff ? "accent" : STATUS_TONE[t.status]}>
                      {!t.last_message_by_staff ? "Needs reply" : STAFF_STATUS_LABEL[t.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
