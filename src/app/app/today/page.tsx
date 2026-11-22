import Link from "next/link";
import { toggleFollowUp } from "@/app/app/actions/leads";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getMyOpenFollowUps, getUpcomingFollowUps, getUserTimeZone, type FollowUpWithLead } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { endOfToday, startOfToday } from "@/lib/time";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const ctx = await requireWorkspace();
  const { tz } = await getUserTimeZone();
  const end = endOfToday(tz);
  const start = startOfToday(tz);
  const [due, upcoming] = await Promise.all([
    getMyOpenFollowUps(ctx.workspace.id, ctx.userId, end),
    getUpcomingFollowUps(ctx.workspace.id, ctx.userId, end),
  ]);
  const overdue = due.filter((f) => new Date(f.due_at) < start);
  const today = due.filter((f) => new Date(f.due_at) >= start);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Today" description="Your follow-ups that are overdue or due today." />
      {due.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="No follow-ups are due today. Schedule one from any lead's page."
        />
      ) : (
        <>
          {overdue.length > 0 && <Group title="Overdue" items={overdue} tz={tz} tone="danger" />}
          {today.length > 0 && <Group title="Due today" items={today} tz={tz} />}
        </>
      )}
      {upcoming.length > 0 && <Group title="Coming up" items={upcoming} tz={tz} muted />}
    </div>
  );
}

function Group({
  title,
  items,
  tz,
  tone,
  muted,
}: {
  title: string;
  items: FollowUpWithLead[];
  tz: string;
  tone?: "danger";
  muted?: boolean;
}) {
  return (
    <section aria-labelledby={`group-${title}`}>
      <h2 id={`group-${title}`} className={cn("mb-2 text-sm font-semibold", tone === "danger" ? "text-danger" : "text-muted")}>
        {title} <span className="font-normal">({items.length})</span>
      </h2>
      <Card>
        <ul className="divide-y divide-line">
          {items.map((f) => (
            <li key={f.id} className="flex items-start gap-3 p-4">
              {!muted && (
                <form action={toggleFollowUp}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="done" value="true" />
                  <button
                    type="submit"
                    aria-label={`Mark "${f.task}" as done`}
                    className="mt-0.5 size-5 rounded-full border border-line-strong hover:border-accent hover:bg-accent-soft"
                  />
                </form>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{f.task}</p>
                <p className="text-sm text-muted">
                  {f.lead ? (
                    <Link href={`/app/leads/${f.lead.id}`} className="hover:underline">
                      {f.lead.name}
                      {f.lead.company ? ` · ${f.lead.company}` : ""}
                    </Link>
                  ) : (
                    "Lead not available"
                  )}
                </p>
              </div>
              <time dateTime={f.due_at} className={cn("shrink-0 text-xs", tone === "danger" ? "text-danger" : "text-subtle")}>
                {formatDate(f.due_at, { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
