import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { AUDIT_PAGE_SIZE, getAuditLog, getSupportSessions } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Audit log" };

const ACTION_LABEL: Record<string, string> = {
  "impersonation.start": "Started support session",
  "impersonation.end": "Ended support session",
  "ticket.reply": "Replied to ticket",
  "ticket.internal_note": "Added internal note",
  "ticket.update": "Updated ticket",
};

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const [{ rows, total }, sessions] = await Promise.all([getAuditLog(page), getSupportSessions(10)]);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const now = await requestTime();

  return (
    <div className="space-y-6">
      <PageTitle title="Audit log" description="Every staff action, newest first. Entries can't be edited or deleted from the app." />

      <Card className="overflow-x-auto">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Recent support sessions</h2>
        {sessions.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">No one has used “Log in as” yet.</p>
        ) : (
          <table className="w-full min-w-2xl text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                <th scope="col" className="px-4 py-2 font-medium">Started</th>
                <th scope="col" className="px-4 py-2 font-medium">Reason</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const active = !s.ended_at && new Date(s.expires_at).getTime() > now;
                return (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(s.started_at, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-2.5">
                      {s.reason}
                      {s.workspace_id && (
                        <Link href={`/admin/organizations/${s.workspace_id}`} className="ml-2 text-xs text-accent-text hover:underline">
                          Organization
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {active ? (
                        <Badge tone="warning">Active</Badge>
                      ) : s.ended_at ? (
                        <span className="text-muted">Ended {formatDate(s.ended_at, { timeStyle: "short" })}</span>
                      ) : (
                        <span className="text-muted">Expired</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="Nothing recorded yet" description="Staff actions will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                <th scope="col" className="px-4 py-2.5 font-medium">When</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Who</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Organization</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                    {formatDate(r.created_at, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2.5">{r.actor_email}</td>
                  <td className="px-4 py-2.5">
                    {ACTION_LABEL[r.action] ?? r.action}
                    {r.ticket_id && (
                      <Link href={`/admin/support/${r.ticket_id}`} className="ml-2 text-xs text-accent-text hover:underline">
                        Ticket
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.workspace_id ? (
                      <Link href={`/admin/organizations/${r.workspace_id}`} className="hover:underline">
                        {r.workspaceName ?? "Deleted"}
                      </Link>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="max-w-sm px-4 py-2.5">
                    <code className="text-xs break-all text-muted">
                      {r.details && JSON.stringify(r.details) !== "{}" ? JSON.stringify(r.details) : ""}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <ButtonLink href={`/admin/audit?page=${page - 1}`} variant="secondary" size="sm">
                Previous
              </ButtonLink>
            )}
            {page < pages && (
              <ButtonLink href={`/admin/audit?page=${page + 1}`} variant="secondary" size="sm">
                Next
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Current time for this request (kept out of render so it's computed once). */
async function requestTime() {
  return Date.now();
}
