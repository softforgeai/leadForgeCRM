import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { getUser } from "@/lib/admin-data";
import { formatDate, formatRelative } from "@/lib/format";
import { PRIORITY_LABEL, PRIORITY_TONE, STAFF_STATUS_LABEL, STATUS_TONE, isOpenStatus, ticketRef } from "@/lib/support";
import { LoginAsButton } from "../../AdminForms";

export const metadata = { title: "User" };

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;


export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const data = await getUser(id);
  if (!data) notFound();
  const { user, memberships, tickets, sessions } = data;

  const details: [string, ReactNode][] = [
    ["User ID", <span key="id" className="font-mono text-xs break-all">{user.id}</span>],
    ["Email", user.email ?? "—"],
    ["Email confirmed", user.emailConfirmedAt ? formatDate(user.emailConfirmedAt, { dateStyle: "medium", timeStyle: "short" }) : "Not confirmed"],
    ["Sign-in method", user.providers.map((p) => (p === "email" ? "Email and password" : p)).join(", ")],
    ["Joined", formatDate(user.createdAt, { dateStyle: "medium", timeStyle: "short" })],
    [
      "Last sign-in",
      user.lastSignInAt
        ? `${formatRelative(user.lastSignInAt)} (${formatDate(user.lastSignInAt, { dateStyle: "medium", timeStyle: "short" })})`
        : "Never",
    ],
  ];
  if (user.phone) details.splice(2, 0, ["Phone", user.phone]);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Users
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={user.name} className="size-14 text-lg" />
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            {user.name}
            {user.isPlatformAdmin && (
              <Badge tone="accent" className="gap-1">
                <ShieldCheck aria-hidden className="size-3" /> Platform admin
              </Badge>
            )}
            {!user.emailConfirmedAt && <Badge tone="warning">Email not confirmed</Badge>}
            {user.isSuspended && <Badge tone="danger">Suspended</Badge>}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Organizations</h2>
            <p className="text-sm text-muted">
              {memberships.length === 0
                ? "This user hasn't created or joined an organization yet."
                : "Log in as this user in any of their organizations to see exactly what they see."}
            </p>
          </div>
          {memberships.length > 0 && (
            <ul className="divide-y divide-line">
              {memberships.map((m) => (
                <li key={m.workspace_id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <Link href={`/admin/organizations/${m.workspace_id}`} className="hover:text-accent-text hover:underline">
                        {m.workspace?.name ?? "Deleted organization"}
                      </Link>
                      <Badge>{ROLE_LABEL[m.role]}</Badge>
                      {m.workspace?.is_demo && <Badge tone="warning">Demo</Badge>}
                    </p>
                    <p className="text-xs text-subtle">
                      Shown as “{m.display_name}” · joined {formatDate(m.created_at)}
                    </p>
                  </div>
                  <LoginAsButton
                    userId={user.id}
                    workspaceId={m.workspace_id}
                    name={m.display_name}
                    disabledReason={user.isPlatformAdmin ? "Platform admins can't be impersonated." : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="border-b border-line px-5 py-4 font-semibold">Account</h2>
          <dl className="divide-y divide-line text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 px-5 py-2.5">
                <dt className="text-xs text-subtle">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Support tickets</h2>
            <span className="text-sm text-muted">{tickets.filter((t) => isOpenStatus(t.status)).length} open</span>
          </div>
          {tickets.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">No tickets from this user.</p>
          ) : (
            <ul className="divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/support/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                      <p className="truncate text-xs text-subtle">
                        {ticketRef(t.number)} · {t.workspace?.name ?? "Deleted organization"} · {formatRelative(t.last_message_at)}
                      </p>
                    </div>
                    {t.priority !== "normal" && <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>}
                    <Badge tone={STATUS_TONE[t.status]}>{STAFF_STATUS_LABEL[t.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Support sessions</h2>
            <p className="text-sm text-muted">Times our staff logged in as this user.</p>
          </div>
          {sessions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">No one has logged in as this user.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{s.reason}</p>
                    <p className="text-xs text-subtle">{formatDate(s.started_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  {s.state === "active" ? (
                    <Badge tone="warning">Active</Badge>
                  ) : (
                    <span className="text-xs text-muted">{s.state === "ended" ? "Ended" : "Expired"}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Full history in the{" "}
            <Link href="/admin/audit" className="text-accent-text hover:underline">
              audit log
            </Link>
            .
          </p>
        </Card>
      </div>
    </div>
  );
}
