import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { FilterForm, FilterPending, FilterResults, FilterScope } from "@/components/filters";
import { Avatar, Badge, ButtonLink, Card, EmptyState, Input, PageTitle, Select } from "@/components/ui";
import {
  USER_PAGE_SIZE,
  getUsers,
  getWorkspaceOptions,
  parseUserFilters,
  type UserFilters,
} from "@/lib/admin-data";
import { formatDate, formatRelative } from "@/lib/format";

export const metadata = { title: "Users" };

const STATUS_OPTIONS: { value: NonNullable<UserFilters["status"]>; label: string }[] = [
  { value: "active", label: "Active in the last 7 days" },
  { value: "inactive", label: "Inactive for 30+ days" },
  { value: "never", label: "Never signed in" },
  { value: "unconfirmed", label: "Email not confirmed" },
  { value: "no_workspace", label: "No organization" },
  { value: "admin", label: "Platform admins" },
];

const SORT_OPTIONS: { value: UserFilters["sort"]; label: string }[] = [
  { value: "created", label: "Newest first" },
  { value: "last_sign_in", label: "Recently signed in" },
  { value: "name", label: "Name (A–Z)" },
  { value: "email", label: "Email (A–Z)" },
];

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

function queryFor(f: UserFilters, patch: Partial<UserFilters>) {
  const merged = { ...f, ...patch };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.workspace) params.set("workspace", merged.workspace);
  if (merged.role) params.set("role", merged.role);
  if (merged.status) params.set("status", merged.status);
  if (merged.sort !== "created") params.set("sort", merged.sort);
  if (merged.demo) params.set("demo", "1");
  if (merged.page > 1) params.set("page", String(merged.page));
  const s = params.toString();
  return s ? `/admin/users?${s}` : "/admin/users";
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const filters = parseUserFilters(await searchParams);
  const [{ rows, total }, workspaces] = await Promise.all([getUsers(filters), getWorkspaceOptions()]);
  const pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (filters.page - 1) * USER_PAGE_SIZE + 1;
  const lastRow = Math.min(filters.page * USER_PAGE_SIZE, total);
  const hasFilters = Boolean(filters.q || filters.workspace || filters.role || filters.status || filters.demo);
  const selectedOrg = workspaces.find((w) => w.id === filters.workspace);

  return (
    <FilterScope className="space-y-5">
      <PageTitle
        title="Users"
        description={`${total} ${total === 1 ? "user" : "users"}${hasFilters ? " match your filters" : " across every organization"}${selectedOrg ? ` · in ${selectedOrg.name}` : ""}`}
      />

      <FilterForm className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <label htmlFor="u-q" className="sr-only">
            Search users
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input id="u-q" name="q" type="search" defaultValue={filters.q} placeholder="Name, email or user ID" className="pl-9" autoComplete="off" />
        </div>
        <label htmlFor="u-org" className="sr-only">
          Organization
        </label>
        <Select id="u-org" name="workspace" defaultValue={filters.workspace ?? ""} className="lg:w-52">
          <option value="">All organizations</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {w.is_demo ? " (demo)" : ""}
            </option>
          ))}
        </Select>
        <label htmlFor="u-role" className="sr-only">
          Role
        </label>
        <Select id="u-role" name="role" defaultValue={filters.role ?? ""} className="lg:w-36">
          <option value="">Any role</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="rep">Sales rep</option>
        </Select>
        <label htmlFor="u-status" className="sr-only">
          Status
        </label>
        <Select id="u-status" name="status" defaultValue={filters.status ?? ""} className="lg:w-52">
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <label htmlFor="u-sort" className="sr-only">
          Sort
        </label>
        <Select id="u-sort" name="sort" defaultValue={filters.sort} className="lg:w-44">
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" name="demo" value="1" defaultChecked={filters.demo} className="size-4" /> Include demo
        </label>
        {hasFilters && (
          <Link href="/admin/users" className="px-1 text-sm text-accent-text hover:underline">
            Clear filters
          </Link>
        )}
        <FilterPending />
      </FilterForm>

      <FilterResults className="space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No users match these filters" : "No users yet"}
            description={hasFilters ? "Try a different search or clear the filters." : "Users appear here as soon as they sign up."}
            action={
              hasFilters && (
                <ButtonLink href="/admin/users" variant="secondary">
                  Clear filters
                </ButtonLink>
              )
            }
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-4xl text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                  <th scope="col" className="px-4 py-2.5 font-medium">User</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Organizations</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Last sign-in</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-line align-top last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} className="size-9 text-xs" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5">
                            <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-accent-text hover:underline">
                              {u.name}
                            </Link>
                            {u.is_platform_admin && (
                              <Badge tone="accent" className="gap-1">
                                <ShieldCheck aria-hidden className="size-3" /> Staff
                              </Badge>
                            )}
                            {!u.email_confirmed_at && <Badge tone="warning">Unconfirmed</Badge>}
                          </p>
                          <p className="truncate text-xs text-subtle">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.memberships.length === 0 ? (
                        <span className="text-subtle">None</span>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {u.memberships.slice(0, 3).map((m) => (
                            <li key={m.workspace_id}>
                              <Link
                                href={`/admin/organizations/${m.workspace_id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs hover:border-line-strong hover:bg-surface-2"
                              >
                                <span className="max-w-40 truncate font-medium">{m.workspace_name}</span>
                                <span className="text-subtle">· {ROLE_LABEL[m.role]}</span>
                                {m.is_demo && <span className="text-warning">· demo</span>}
                              </Link>
                            </li>
                          ))}
                          {u.memberships.length > 3 && (
                            <li className="px-1 py-0.5 text-xs text-subtle">+{u.memberships.length - 3} more</li>
                          )}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {u.last_sign_in_at ? formatRelative(u.last_sign_in_at) : <span className="text-subtle">Never</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {total > 0 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              Showing <span className="font-medium text-fg">{firstRow}</span>–<span className="font-medium text-fg">{lastRow}</span> of{" "}
              <span className="font-medium text-fg">{total}</span>
            </span>
            {pages > 1 && (
              <div className="flex gap-2">
                {filters.page > 1 && (
                  <ButtonLink href={queryFor(filters, { page: filters.page - 1 })} variant="secondary" size="sm" scroll={false}>
                    Previous
                  </ButtonLink>
                )}
                {filters.page < pages && (
                  <ButtonLink href={queryFor(filters, { page: filters.page + 1 })} variant="secondary" size="sm" scroll={false}>
                    Next
                  </ButtonLink>
                )}
              </div>
            )}
          </nav>
        )}
      </FilterResults>
    </FilterScope>
  );
}
