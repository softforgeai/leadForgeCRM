import Link from "next/link";
import { Plus, Target, Trophy, UserPlus, Wallet } from "lucide-react";
import { ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { FALLBACK_COLOR, stageColors } from "@/lib/stage-colors";
import { SOURCE_LABELS } from "@/lib/validation";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireWorkspace();
  const data = await getDashboardData(ctx.workspace.id);
  const scope = ctx.isManager ? "Team" : "Your";
  const maxStage = Math.max(1, ...data.byStage.map((s) => s.count));
  const colors = stageColors(data.byStage.map((s) => s.stage));
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
            <Stat
              label={`${scope} open pipeline`}
              value={formatMoney(data.pipelineValue)}
              icon={Wallet}
              tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            />
            <Stat
              label="Won revenue"
              value={formatMoney(data.wonValue)}
              icon={Trophy}
              tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            />
            <Stat
              label="Win rate"
              value={data.winRate === null ? "—" : `${Math.round(data.winRate * 100)}%`}
              hint="Won ÷ (won + lost)"
              icon={Target}
              tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            />
            <Stat
              label="New leads this month"
              value={String(data.newThisMonth)}
              hint={`${data.totalLeads} in total`}
              icon={UserPlus}
              tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
            />
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
                          className={`h-full rounded-full ${(colors.get(stage.id) ?? FALLBACK_COLOR).fill}`}
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

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
        {hint && <dd className="mt-0.5 text-xs text-subtle">{hint}</dd>}
      </div>
    </Card>
  );
}
