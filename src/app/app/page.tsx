import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/validation";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireWorkspace();
  const data = await getDashboardData(ctx.workspace.id);
  const scope = ctx.isManager ? "Team" : "Your";
  const maxStage = Math.max(1, ...data.byStage.map((s) => s.count));
  const maxSource = Math.max(1, ...data.bySource.map((s) => s.count));

  return (
    <div className="space-y-6">
      <PageTitle
        title="Dashboard"
        description={ctx.isManager ? "How the whole team's pipeline is doing." : "How your pipeline is doing."}
        actions={
          <ButtonLink href="/app/leads/new">
            <Plus aria-hidden className="size-4" /> New lead
          </ButtonLink>
        }
      />

      {data.totalLeads === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Add your first lead, import a CSV, or share your lead-capture form to get started."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/app/leads/new">Add a lead</ButtonLink>
              <ButtonLink href="/app/import" variant="secondary">
                Import CSV
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={`${scope} open pipeline`} value={formatMoney(data.pipelineValue)} />
            <Stat label="Won" value={formatMoney(data.wonValue)} />
            <Stat
              label="Win rate"
              value={data.winRate === null ? "—" : `${Math.round(data.winRate * 100)}%`}
              hint="Won ÷ (won + lost)"
            />
            <Stat label="New leads this month" value={String(data.newThisMonth)} hint={`${data.totalLeads} in total`} />
          </dl>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-semibold">Leads by stage</h2>
              <ul className="mt-5 space-y-3">
                {data.byStage.map(({ stage, count, value }) => (
                  <li key={stage.id}>
                    <Link href={`/app/leads?stage=${stage.id}`} className="group block">
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="font-medium group-hover:underline">{stage.name}</span>
                        <span className="tabular-nums text-muted">
                          {count} · {formatMoney(value)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={
                            stage.kind === "won" ? "h-full bg-success" : stage.kind === "lost" ? "h-full bg-subtle" : "h-full bg-accent"
                          }
                          style={{ width: `${(count / maxStage) * 100}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold">Lead sources</h2>
              <ul className="mt-5 space-y-3">
                {data.bySource.map(({ source, count }) => (
                  <li key={source}>
                    <div className="flex justify-between text-sm">
                      <span>{SOURCE_LABELS[source]}</span>
                      <span className="tabular-nums text-muted">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-accent/70" style={{ width: `${(count / maxSource) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-semibold">Leaderboard</h2>
            <p className="text-sm text-muted">Deals won by each team member.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-md text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtle">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Team member
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Deals won
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Value won
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row, i) => (
                    <tr key={row.user_id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4 text-subtle">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium">
                        {row.display_name}
                        {row.user_id === ctx.userId && <span className="ml-1.5 text-xs text-subtle">(you)</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.won_count}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(row.won_value_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-subtle">{hint}</dd>}
    </Card>
  );
}
