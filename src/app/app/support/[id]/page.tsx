import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { resolveTicket } from "@/app/app/actions/support";
import { Thread } from "@/components/support/Thread";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, isOpenStatus, ticketRef } from "@/lib/support";
import { ReplyForm } from "../SupportForms";

export const metadata = { title: "Support request" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function TicketPage({ params, searchParams }: PageProps<"/app/support/[id]">) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  // RLS decides visibility; internal staff notes are never returned here.
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from("support_tickets").select("*").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle(),
    supabase.from("support_messages").select("*").eq("ticket_id", id).order("created_at"),
  ]);
  if (!ticket) notFound();
  const open = isOpenStatus(ticket.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/support" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Help & support
      </Link>

      {sent === "1" && (
        <Alert tone="success">
          Thanks, we&apos;ve received your request. We&apos;ll reply here, usually within one business day.
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-subtle">
            {ticketRef(ticket.number)} · opened by {ticket.created_by_name} on {formatDate(ticket.created_at)}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight break-words">{ticket.subject}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
            <Badge>{CATEGORY_LABEL[ticket.category]}</Badge>
            <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]} priority</Badge>
          </div>
        </div>
        {open && (
          <form action={resolveTicket}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Button type="submit" variant="secondary" size="sm">
              <CheckCircle2 aria-hidden className="size-4" /> Mark as resolved
            </Button>
          </form>
        )}
      </div>

      <Thread messages={messages ?? []} viewer="customer" />

      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">{open ? "Reply" : "Still need help?"}</h2>
        {!open && <p className="mb-3 text-sm text-muted">Replying will reopen this request.</p>}
        <ReplyForm ticketId={ticket.id} />
      </Card>
    </div>
  );
}
