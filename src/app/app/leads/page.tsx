import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, Input, PageTitle, Select, buttonClass } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { PAGE_SIZE, getLeads, getMembers, getStages, parseLeadFilters, type LeadFilters } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/validation";

export const metadata = { title: "Leads" };

function buildQuery(f: LeadFilters, patch: Partial<LeadFilters>) {
  const merged = { ...f, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "page" && v === 1)) continue;
    if (k === "sort" && v === "created") continue;
    if (k === "dir" && v === "desc") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function SortHeader({
  label,
  sort,
  filters,
  className,
}: {
  label: string;
  sort: LeadFilters["sort"];
  filters: LeadFilters;
  className?: string;
}) {
  const active = filters.sort === sort;
  const nextDir = active && filters.dir === "desc" ? "asc" : "desc";
  return (
    <th scope="col" className={className} aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={`/app/leads${buildQuery(filters, { sort, dir: nextDir, page: 1 })}`}
        className="inline-flex items-center gap-1 hover:text-fg"
      >
        {label}
        {active && (filters.dir === "asc" ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />)}
      </Link>
    </th>
  );
}

export default async function LeadsPage({ searchParams }: PageProps<"/app/leads">) {
  const ctx = await requireWorkspace();
  const filters = parseLeadFilters(await searchParams);
  const [{ leads, total }, stages, members] = await Promise.all([
    getLeads(ctx.workspace.id, filters),
    getStages(ctx.workspace.id),
    getMembers(ctx.workspace.id),
  ]);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const memberById = new Map(members.map((m) => [m.user_id, m.display_name]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pages);
  const hasFilters = Boolean(filters.q || filters.stage || filters.rep || filters.source || filters.tag);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Leads"
        description={`${total} ${total === 1 ? "lead" : "leads"}${hasFilters ? " match your filters" : ""}`}
        actions={
          <>
            <a href={`/app/leads/export${buildQuery(filters, { page: 1 })}`} className={buttonClass("secondary")}>
              <Download aria-hidden className="size-4" /> Export CSV
            </a>
            <ButtonLink href="/app/leads/new">
              <Plus aria-hidden className="size-4" /> New lead
            </ButtonLink>
          </>
        }
      />

      <form method="get" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label htmlFor="q" className="sr-only">
          Search leads
        </label>
        <Input id="q" name="q" placeholder="Search name, company or email" defaultValue={filters.q} className="lg:col-span-2" />
        <label htmlFor="stage" className="sr-only">
          Stage
        </label>
        <Select id="stage" name="stage" defaultValue={filters.stage ?? ""}>
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {ctx.isManager && (
          <>
            <label htmlFor="rep" className="sr-only">
              Assigned to
            </label>
            <Select id="rep" name="rep" defaultValue={filters.rep ?? ""}>
              <option value="">Everyone</option>
              <option value="none">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
          </>
        )}
        <label htmlFor="source" className="sr-only">
          Source
        </label>
        <Select id="source" name="source" defaultValue={filters.source ?? ""}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <label htmlFor="tag" className="sr-only">
            Tag
          </label>
          <Input id="tag" name="tag" placeholder="Tag" defaultValue={filters.tag} className="min-w-0" />
          <button type="submit" className={buttonClass("secondary")}>
            Filter
          </button>
        </div>
        {hasFilters && (
          <Link href="/app/leads" className="text-sm text-accent-text hover:underline sm:col-span-2 lg:col-span-6">
            Clear filters
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No leads match these filters" : "No leads yet"}
          description={hasFilters ? "Try a different search or clear the filters." : "Add a lead or import a CSV to get started."}
          action={!hasFilters && <ButtonLink href="/app/leads/new">Add a lead</ButtonLink>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead className="bg-surface-2/60">
                <tr className="text-left text-xs uppercase tracking-wide text-subtle">
                  <SortHeader label="Name" sort="name" filters={filters} className="px-4 py-3 font-medium" />
                  <th scope="col" className="px-4 py-3 font-medium">
                    Stage
                  </th>
                  <SortHeader label="Value" sort="value" filters={filters} className="px-4 py-3 text-right font-medium" />
                  <th scope="col" className="px-4 py-3 font-medium">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Assigned to
                  </th>
                  <SortHeader label="Added" sort="created" filters={filters} className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const stage = stageById.get(lead.stage_id);
                  return (
                    <tr key={lead.id} className="border-t border-line hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <Link href={`/app/leads/${lead.id}`} className="font-medium hover:underline">
                          {lead.name}
                        </Link>
                        <p className="text-xs text-muted">{[lead.company, lead.email].filter(Boolean).join(" · ")}</p>
                        {lead.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.tags.map((t) => (
                              <Link key={t} href={`/app/leads${buildQuery(filters, { tag: t, page: 1 })}`}>
                                <Badge>{t}</Badge>
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={stage?.kind === "won" ? "success" : stage?.kind === "lost" ? "neutral" : "accent"}>
                          {stage?.name ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(lead.value_cents)}</td>
                      <td className="px-4 py-3 text-muted">{SOURCE_LABELS[lead.source]}</td>
                      <td className="px-4 py-3 text-muted">
                        {lead.assigned_to ? (memberById.get(lead.assigned_to) ?? "—") : "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDate(lead.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <ButtonLink href={`/app/leads${buildQuery(filters, { page: page - 1 })}`} variant="secondary" size="sm">
                Previous
              </ButtonLink>
            )}
            {page < pages && (
              <ButtonLink href={`/app/leads${buildQuery(filters, { page: page + 1 })}`} variant="secondary" size="sm">
                Next
              </ButtonLink>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
