import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import type { SupportTicket } from "@/lib/database.types";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, isOpenStatus, ticketRef } from "@/lib/support";

export const metadata = { title: "Help & support" };

export default async function SupportPage() {
  const ctx = await requireWorkspace();
  const supabase = await createClient();
  // RLS: reps get their own tickets, owners and admins get the whole workspace's.
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, number, subject, category, priority, status, created_by, created_by_name, last_message_at, last_message_by_staff")
    .eq("workspace_id", ctx.workspace.id)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const tickets = data ?? [];
  const open = tickets.filter((t) => isOpenStatus(t.status));
  const closed = tickets.filter((t) => !isOpenStatus(t.status));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageTitle
        title="Help & support"
        description={
          ctx.isManager
            ? "Report a problem or ask a question. You can see every request from your workspace."
            : "Report a problem or ask a question. Our team usually replies within one business day."
        }
        actions={
          <ButtonLink href="/app/support/new">
            <Plus aria-hidden className="size-4" /> New request
          </ButtonLink>
        }
      />

      {tickets.length === 0 ? (
        <EmptyState
          title="No support requests yet"
          description="If something isn't working or you're stuck, send us a request and we'll get back to you here."
          action={<ButtonLink href="/app/support/new">Contact support</ButtonLink>}
        />
      ) : (
        <>
          <TicketList title="Open" tickets={open} userId={ctx.userId} empty="Nothing open right now." />
          {closed.length > 0 && <TicketList title="Resolved" tickets={closed} userId={ctx.userId} />}
        </>
      )}

      <Card className="flex items-start gap-4 p-5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
          <LifeBuoy aria-hidden className="size-5" />
        </span>
        <div className="text-sm">
          <p className="font-medium">How we help</p>
          <p className="mt-1 text-muted">
            To fix some problems we may need to look at your workspace the way you see it. When we do, it&apos;s
            time-limited, recorded, and only done by the LeadForge support team.
          </p>
        </div>
      </Card>
    </div>
  );
}

type Row = Pick<
  SupportTicket,
  | "id"
  | "number"
  | "subject"
  | "category"
  | "priority"
  | "status"
  | "created_by"
  | "created_by_name"
  | "last_message_at"
  | "last_message_by_staff"
>;

function TicketList({ title, tickets, userId, empty }: { title: string; tickets: Row[]; userId: string; empty?: string }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted">
        {title} <span className="font-normal text-subtle">({tickets.length})</span>
      </h2>
      {tickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {tickets.map((t) => {
              const newReply = t.last_message_by_staff && isOpenStatus(t.status);
              return (
                <li key={t.id}>
                  <Link
                    href={`/app/support/${t.id}`}
                    className="flex flex-col gap-1.5 px-4 py-3.5 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {newReply && <span aria-label="New reply" className="size-2 shrink-0 rounded-full bg-accent" />}
                        <span className="truncate">{t.subject}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">
                        {ticketRef(t.number)} · {CATEGORY_LABEL[t.category]}
                        {t.created_by !== userId && <> · by {t.created_by_name}</>} · updated{" "}
                        {formatRelative(t.last_message_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {(t.priority === "high" || t.priority === "urgent") && (
                        <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                      )}
                      <Badge tone={newReply ? "accent" : STATUS_TONE[t.status]}>
                        {newReply ? "New reply" : STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
