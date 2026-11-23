import Link from "next/link";
import { Search } from "lucide-react";
import { Badge, Card, EmptyState, Input, PageTitle, Select, buttonClass } from "@/components/ui";
import { getOrganizations, type OrgSort } from "@/lib/admin-data";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";

export const metadata = { title: "Organizations" };

const SORTS: { value: OrgSort; label: string }[] = [
  { value: "created", label: "Newest first" },
  { value: "activity", label: "Most recently active" },
  { value: "leads", label: "Most leads" },
  { value: "members", label: "Most members" },
  { value: "tickets", label: "Most open tickets" },
  { value: "name", label: "Name (A–Z)" },
];

export default async function OrganizationsPage({ searchParams }: PageProps<"/admin/organizations">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const sort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as OrgSort) : "created";
  const showDemo = sp.demo === "1";
  const orgs = await getOrganizations({ q, sort, showDemo });

  return (
    <div className="space-y-5">
      <PageTitle title="Organizations" description={`${orgs.length} ${orgs.length === 1 ? "organization" : "organizations"}`} />

      <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <label htmlFor="org-q" className="sr-only">
            Search organizations
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input id="org-q" name="q" type="search" defaultValue={q} placeholder="Name, owner, email or ID" className="pl-9" />
        </div>
        <label htmlFor="org-sort" className="sr-only">
          Sort
        </label>
        <Select id="org-sort" name="sort" defaultValue={sort} className="sm:w-56">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" name="demo" value="1" defaultChecked={showDemo} className="size-4" /> Include demo
        </label>
        <button type="submit" className={buttonClass("secondary")}>
          Apply
        </button>
      </form>

      {orgs.length === 0 ? (
        <EmptyState title="No organizations found" description="Try a different search." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                <th scope="col" className="px-4 py-2.5 font-medium">Organization</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Owner</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Members</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Leads</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Open pipeline</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Last activity</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/organizations/${o.id}`} className="font-medium hover:text-accent-text hover:underline">
                      {o.name}
                    </Link>
                    <p className="text-xs text-subtle">
                      Joined {formatDate(o.created_at)}
                      {o.is_demo && (
                        <Badge tone="warning" className="ml-1.5">
                          Demo
                        </Badge>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate">{o.owner_name ?? "—"}</p>
                    <p className="truncate text-xs text-subtle">{o.owner_email}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.member_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {o.lead_count}
                    {o.leads_30d > 0 && <span className="block text-xs text-subtle">+{o.leads_30d} / 30d</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(o.open_value_cents)}</td>
                  <td className="px-4 py-3 text-muted">{o.last_activity_at ? formatRelative(o.last_activity_at) : "Never"}</td>
                  <td className="px-4 py-3 text-right">
                    {o.open_tickets > 0 ? <Badge tone="accent">{o.open_tickets} open</Badge> : <span className="text-subtle">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
