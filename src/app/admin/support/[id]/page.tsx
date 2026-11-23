import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Thread } from "@/components/support/Thread";
import { Badge, Card } from "@/components/ui";
import { getTicketForStaff } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STAFF_STATUS_LABEL, STATUS_TONE, ticketRef } from "@/lib/support";
import { LoginAsButton, StaffReplyForm, TicketControls } from "../../AdminForms";

export const metadata = { title: "Ticket" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

export default async function StaffTicketPage({ params }: PageProps<"/admin/support/[id]">) {
  const { id } = await params;
  const data = await getTicketForStaff(id);
  if (!data) notFound();
  const { ticket, messages, reporter } = data;

  return (
    <div className="space-y-5">
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Support inbox
      </Link>

      <div>
        <p className="text-xs text-subtle">
          {ticketRef(ticket.number)} · opened {formatDate(ticket.created_at, { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight break-words">{ticket.subject}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={STATUS_TONE[ticket.status]}>{STAFF_STATUS_LABEL[ticket.status]}</Badge>
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]} priority</Badge>
          <Badge>{CATEGORY_LABEL[ticket.category]}</Badge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <Thread messages={messages} viewer="staff" />
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold">Respond</h2>
            <StaffReplyForm ticketId={ticket.id} status={ticket.status} />
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-4 text-sm">
            <h2 className="font-semibold">Customer</h2>
            <div>
              <p className="font-medium">{ticket.created_by_name}</p>
              <p className="break-all text-muted">{ticket.created_by_email}</p>
              {reporter && <p className="text-xs text-subtle">{ROLE_LABEL[reporter.role]}</p>}
            </div>
            {ticket.workspace ? (
              <p>
                <Link href={`/admin/organizations/${ticket.workspace.id}`} className="text-accent-text hover:underline">
                  {ticket.workspace.name}
                </Link>
                {ticket.workspace.is_demo && <span className="text-subtle"> (demo)</span>}
              </p>
            ) : (
              <p className="text-subtle">Organization deleted</p>
            )}
            {ticket.page_url && (
              <p className="text-xs text-muted">
                Where: <span className="font-mono break-all">{ticket.page_url}</span>
              </p>
            )}
            {reporter && ticket.created_by && ticket.workspace && (
              <LoginAsButton
                userId={ticket.created_by}
                workspaceId={ticket.workspace.id}
                name={ticket.created_by_name}
                defaultReason={`Ticket ${ticketRef(ticket.number)}: ${ticket.subject}`.slice(0, 300)}
              />
            )}
            {!reporter && <p className="text-xs text-subtle">The reporter is no longer a member of this organization.</p>}
          </Card>

          <Card className="p-4">
            <TicketControls ticketId={ticket.id} status={ticket.status} priority={ticket.priority} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
