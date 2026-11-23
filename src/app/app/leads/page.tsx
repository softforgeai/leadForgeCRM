import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, KanbanSquare, List, Plus, Search } from "lucide-react";
import { StagePill } from "@/components/StagePill";
import { FilterForm, FilterPending, FilterResults, FilterScope } from "@/components/filters";
import { Avatar, ButtonLink, EmptyState, buttonClass } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { PAGE_SIZE, getLeads, getMembers, getStages, parseLeadFilters, type LeadFilters } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { FALLBACK_COLOR, stageColors } from "@/lib/stage-colors";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/validation";

export const metadata = { title: "Contacts" };

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
  const Icon = !active ? ChevronsUpDown : filters.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={className} aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={`/app/leads${buildQuery(filters, { sort, dir: nextDir, page: 1 })}`}
        className="inline-flex items-center gap-1 hover:text-fg"
      >
        {label}
        <Icon aria-hidden className={active ? "size-3" : "size-3 opacity-40"} />
      </Link>
    </th>
  );
}

const filterField =
  "h-9 rounded-lg border border-line bg-surface px-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none";

export default async function ContactsPage({ searchParams }: PageProps<"/app/leads">) {
  const ctx = await requireWorkspace();
  const filters = parseLeadFilters(await searchParams);
  const [{ leads, total }, stages, members] = await Promise.all([
    getLeads(ctx.workspace.id, filters),
    getStages(ctx.workspace.id),
    getMembers(ctx.workspace.id),
  ]);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const colors = stageColors(stages);
  const memberById = new Map(members.map((m) => [m.user_id, m.display_name]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pages);
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);
  const hasFilters = Boolean(filters.q || filters.stage || filters.rep || filters.source || filters.tag);

  return (
    <FilterScope className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "contact" : "contacts"}
            {hasFilters ? " match your filters" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <Link
              href="/app/pipeline"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg"
            >
              <KanbanSquare aria-hidden className="size-4" /> Board
            </Link>
            <span aria-current="page" className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-sm font-medium">
              <List aria-hidden className="size-4" /> List
            </span>
          </div>
          <a href={`/app/leads/export${buildQuery(filters, { page: 1 })}`} data-no-progress className={buttonClass("secondary", "sm")}>
            <Download aria-hidden className="size-4" /> Export
          </a>
          <ButtonLink href="/app/leads/new" size="sm">
            <Plus aria-hidden className="size-4" /> Add lead
          </ButtonLink>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {/* Filter bar */}
        <FilterForm className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          {/* Keep the current sort when filters change. */}
          {filters.sort && filters.sort !== "created" && <input type="hidden" name="sort" value={filters.sort} />}
          {filters.dir && filters.dir !== "desc" && <input type="hidden" name="dir" value={filters.dir} />}
          <div className="relative min-w-48 flex-1 sm:max-w-72">
            <label htmlFor="q" className="sr-only">
              Search contacts
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" />
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Name, company or email"
              defaultValue={filters.q}
              className={`${filterField} w-full pl-8`}
            />
          </div>
          <label htmlFor="stage" className="sr-only">
            Stage
          </label>
          <select id="stage" name="stage" defaultValue={filters.stage ?? ""} className={filterField}>
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {ctx.isManager && (
            <>
              <label htmlFor="rep" className="sr-only">
                Owner
              </label>
              <select id="rep" name="rep" defaultValue={filters.rep ?? ""} className={filterField}>
                <option value="">All owners</option>
                <option value="none">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="source" className="sr-only">
            Source
          </label>
          <select id="source" name="source" defaultValue={filters.source ?? ""} className={filterField}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <label htmlFor="tag" className="sr-only">
            Tag
          </label>
          <input id="tag" name="tag" placeholder="Tag" defaultValue={filters.tag} className={`${filterField} w-28`} />
          {hasFilters && (
            <Link href="/app/leads" className="text-sm text-accent-text hover:underline">
              Clear
            </Link>
          )}
          <FilterPending className="ml-auto" />
        </FilterForm>

        <FilterResults>

        {leads.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={hasFilters ? "No contacts match these filters" : "No contacts yet"}
              description={hasFilters ? "Try a different search or clear the filters." : "Add a lead or import a CSV to get started."}
              action={!hasFilters && <ButtonLink href="/app/leads/new">Add a lead</ButtonLink>}
            />
          </div>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-line bg-surface-2/70">
                <tr className="text-left text-xs font-medium tracking-wide text-subtle uppercase">
                  <SortHeader label="Contact" sort="name" filters={filters} className="px-4 py-2.5 font-medium" />
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Stage
                  </th>
                  <SortHeader label="Value" sort="value" filters={filters} className="px-4 py-2.5 text-right font-medium" />
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Tags
                  </th>
                  <SortHeader label="Updated" sort="updated" filters={filters} className="px-4 py-2.5 font-medium" />
                  <SortHeader label="Created" sort="created" filters={filters} className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => {
                  const stage = stageById.get(lead.stage_id);
                  const owner = lead.assigned_to ? memberById.get(lead.assigned_to) : undefined;
                  return (
                    <tr key={lead.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={lead.name} className="size-8 text-xs" />
                          <div className="min-w-0">
                            <Link href={`/app/leads/${lead.id}`} className="font-medium text-fg hover:text-accent-text">
                              {lead.name}
                            </Link>
                            <p className="truncate text-xs text-muted">
                              {[lead.company, lead.email].filter(Boolean).join(" · ") || "No company or email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {stage && <StagePill name={stage.name} color={colors.get(stage.id) ?? FALLBACK_COLOR} />}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatMoney(lead.value_cents)}</td>
                      <td className="px-4 py-2.5">
                        {owner ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Avatar name={owner} className="size-6 text-[10px]" />
                            <span className="text-muted">{owner}</span>
                          </span>
                        ) : (
                          <span className="text-subtle">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{SOURCE_LABELS[lead.source]}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((t) => (
                            <Link
                              key={t}
                              href={`/app/leads${buildQuery(filters, { tag: t, page: 1 })}`}
                              className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-muted hover:text-fg"
                            >
                              {t}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDate(lead.updated_at)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDate(lead.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm">
            <span className="text-muted">
              Showing <span className="font-medium text-fg">{firstRow}</span>–
              <span className="font-medium text-fg">{lastRow}</span> of <span className="font-medium text-fg">{total}</span>
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                {page > 1 ? (
                  <ButtonLink href={`/app/leads${buildQuery(filters, { page: page - 1 })}`} variant="secondary" size="sm">
                    Previous
                  </ButtonLink>
                ) : null}
                {page < pages ? (
                  <ButtonLink href={`/app/leads${buildQuery(filters, { page: page + 1 })}`} variant="secondary" size="sm">
                    Next
                  </ButtonLink>
                ) : null}
              </div>
            )}
          </nav>
        )}
        </FilterResults>
      </div>
    </FilterScope>
  );
}
