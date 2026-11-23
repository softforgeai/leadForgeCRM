import Link from "next/link";
import { Search } from "lucide-react";
import { FilterForm, FilterPending, FilterResults, FilterScope } from "@/components/filters";
import { Badge, Card, EmptyState, Input, PageTitle, Select } from "@/components/ui";
import { getTickets, parseTicketFilters } from "@/lib/admin-data";
import { formatRelative } from "@/lib/format";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STAFF_STATUS_LABEL,
  STATUS_TONE,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  isOpenStatus,
  ticketRef,
} from "@/lib/support";

export const metadata = { title: "Support inbox" };

export default async function SupportInboxPage({ searchParams }: PageProps<"/admin/support">) {
  const filters = parseTicketFilters(await searchParams);
  const tickets = await getTickets(filters);
  const needsReply = tickets.filter((t) => !t.last_message_by_staff && isOpenStatus(t.status)).length;

  return (
    <FilterScope className="space-y-5">
      <PageTitle
        title="Support inbox"
        description={`${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"} · ${needsReply} waiting on us. Tickets that need a reply come first, then by priority.`}
      />

      <FilterForm className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {filters.workspace && <input type="hidden" name="workspace" value={filters.workspace} />}
        <div className="relative flex-1 sm:max-w-sm">
          <label htmlFor="t-q" className="sr-only">
            Search tickets
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input id="t-q" name="q" type="search" defaultValue={filters.q} placeholder="#1001, subject, name or email" className="pl-9" />
        </div>
        <label htmlFor="t-status" className="sr-only">
          Status
        </label>
        <Select id="t-status" name="status" defaultValue={filters.status} className="sm:w-48">
          <option value="active">All open</option>
          <option value="all">All tickets</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STAFF_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <label htmlFor="t-priority" className="sr-only">
          Priority
        </label>
        <Select id="t-priority" name="priority" defaultValue={filters.priority ?? ""} className="sm:w-40">
          <option value="">Any priority</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
        {filters.workspace && (
          <Link href="/admin/support" className="text-sm text-accent-text hover:underline">
            Clear organization filter
          </Link>
        )}
        <FilterPending />
      </FilterForm>

      <FilterResults>
      {tickets.length === 0 ? (
        <EmptyState title="No tickets" description="Nothing matches these filters." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {tickets.map((t) => {
              const waiting = !t.last_message_by_staff && isOpenStatus(t.status);
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="flex flex-col gap-2 px-4 py-3.5 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {waiting && <span aria-label="Needs reply" className="size-2 shrink-0 rounded-full bg-accent" />}
                        <span className="truncate">{t.subject}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-subtle">
                        {ticketRef(t.number)} · {t.workspace?.name ?? "Deleted organization"}
                        {t.workspace?.is_demo && " (demo)"} · {t.created_by_name} · {CATEGORY_LABEL[t.category]} ·{" "}
                        {formatRelative(t.last_message_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {t.priority !== "normal" && <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>}
                      <Badge tone={waiting ? "accent" : STATUS_TONE[t.status]}>
                        {waiting ? "Needs reply" : STAFF_STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      </FilterResults>
    </FilterScope>
  );
}
