"use client";

import { useActionState, useState } from "react";
import { Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import {
  addStage,
  deleteStage,
  inviteMember,
  regenerateFormLink,
  removeMember,
  renameStage,
  revokeInvite,
  setMemberRole,
  updateWorkspace,
} from "@/app/app/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Avatar, Badge, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/cn";

function Feedback({ state, className }: { state: ActionState; className?: string }) {
  if (!state) return null;
  if (state.ok) return state.message ? <div className={className}><Alert tone="success">{state.message}</Alert></div> : null;
  return state.error ? <div className={className}><Alert>{state.error}</Alert></div> : null;
}

/* --------------------------------------------------------------- General */

export function WorkspaceForm({ name, logoUrl, disabled }: { name: string; logoUrl: string; disabled: boolean }) {
  const [state, action] = useActionState(updateWorkspace, undefined);
  const [preview, setPreview] = useState(logoUrl);
  const fields = state && !state.ok ? state.fields : undefined;
  const validPreview = /^https:\/\/\S+$/.test(preview);
  return (
    <form action={action}>
      <fieldset disabled={disabled} className="space-y-5 p-5">
        <Feedback state={state} />
        <div className="flex items-center gap-4">
          {validPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer URL; next/image would need every host allow-listed
            <img src={preview} alt="" className="size-14 rounded-xl border border-line object-cover" />
          ) : (
            <span className="inline-flex size-14 items-center justify-center rounded-xl bg-accent text-xl font-semibold text-accent-fg">
              {name.trim()[0]?.toUpperCase() ?? "W"}
            </span>
          )}
          <div className="text-sm">
            <p className="font-medium">Workspace logo</p>
            <p className="text-muted">Shown in the sidebar. Use a square image, at least 128×128.</p>
          </div>
        </div>
        <Field label="Workspace name" htmlFor="ws-name" error={fields?.name}>
          <Input id="ws-name" name="name" defaultValue={name} />
        </Field>
        <Field label="Logo URL" htmlFor="ws-logo" error={fields?.logoUrl} hint="Optional. An https:// link to an image.">
          <Input
            id="ws-logo"
            name="logoUrl"
            type="url"
            defaultValue={logoUrl}
            placeholder="https://example.com/logo.png"
            onChange={(e) => setPreview(e.target.value)}
          />
        </Field>
      </fieldset>
      <div className="flex justify-end border-t border-line bg-surface-2/50 px-5 py-3">
        <SubmitButton size="sm" disabled={disabled}>
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- Lead capture */

export function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const id = `copy-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the text is still selectable.
    }
  }
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        {multiline ? (
          <Textarea id={id} readOnly value={value} rows={3} className="font-mono text-xs" />
        ) : (
          <Input id={id} readOnly value={value} className="font-mono text-xs" />
        )}
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition",
            copied ? "border-success/40 bg-success-soft text-success" : "border-line-strong text-muted hover:text-fg",
          )}
        >
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </Field>
  );
}

export function RegenerateFormLink({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(regenerateFormLink, undefined);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <SubmitButton variant="danger" size="sm" pendingText="Creating…" disabled={disabled}>
        <RefreshCw aria-hidden className="size-4" /> Generate a new link
      </SubmitButton>
    </form>
  );
}

/* --------------------------------------------------------------- Pipeline */

type StageRow = { id: string; name: string; kind: "open" | "won" | "lost"; count: number; dot: string };

function StageItem({ stage, disabled }: { stage: StageRow; disabled: boolean }) {
  const [renameState, rename] = useActionState(renameStage, undefined);
  const [deleteState, remove] = useActionState(deleteStage, undefined);
  const [dirty, setDirty] = useState(false);
  const error =
    (renameState && !renameState.ok && (renameState.error ?? renameState.fields?.name)) ||
    (deleteState && !deleteState.ok && deleteState.error);
  const saved = renameState?.ok && !dirty;
  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", stage.dot)} />
        <form
          action={(fd) => {
            setDirty(false);
            return rename(fd);
          }}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <input type="hidden" name="id" value={stage.id} />
          <label htmlFor={`stage-${stage.id}`} className="sr-only">
            Stage name
          </label>
          <Input
            id={`stage-${stage.id}`}
            name="name"
            defaultValue={stage.name}
            disabled={disabled}
            onChange={() => setDirty(true)}
            className="h-9 max-w-xs"
          />
          {dirty && !disabled && (
            <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
              Save
            </SubmitButton>
          )}
          {saved && <Check aria-label="Saved" className="size-4 text-success" />}
        </form>
        <span className="hidden w-20 text-right text-sm text-muted tabular-nums sm:block">
          {stage.count} {stage.count === 1 ? "deal" : "deals"}
        </span>
        <span className="w-16 text-right">
          {stage.kind === "open" ? (
            <Badge>Open</Badge>
          ) : (
            <Badge tone={stage.kind === "won" ? "success" : "danger"}>{stage.kind === "won" ? "Won" : "Lost"}</Badge>
          )}
        </span>
        <span className="w-9">
          {stage.kind === "open" && !disabled && (
            <form action={remove}>
              <input type="hidden" name="id" value={stage.id} />
              <button
                type="submit"
                aria-label={`Remove stage ${stage.name}`}
                title={stage.count > 0 ? "Move this stage's deals first" : "Remove stage"}
                className="inline-flex size-9 items-center justify-center rounded-lg text-subtle hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </form>
          )}
        </span>
      </div>
      {error && <p className="mt-1.5 pl-5 text-sm text-danger">{error}</p>}
    </li>
  );
}

export function StageList({ stages, disabled }: { stages: StageRow[]; disabled: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {stages.map((s) => (
        <StageItem key={s.id} stage={s} disabled={disabled} />
      ))}
    </ul>
  );
}

export function AddStageForm() {
  const [state, action] = useActionState(addStage, undefined);
  const error = state && !state.ok ? (state.error ?? state.fields?.name) : undefined;
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="new-stage" className="sr-only">
          New stage name
        </label>
        <Input id="new-stage" name="name" placeholder="e.g. Negotiation" className="h-9 max-w-xs" />
        <SubmitButton size="sm" pendingText="Adding…">
          Add stage
        </SubmitButton>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {state?.ok && <p className="text-sm text-success">{state.message}</p>}
    </form>
  );
}

/* ------------------------------------------------------------------ Team */

const ROLE_LABEL = { owner: "Owner", admin: "Admin", rep: "Sales rep" } as const;

export function MemberRow({
  userId,
  name,
  email,
  role,
  isYou,
  editable,
}: {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "rep";
  isYou: boolean;
  editable: boolean;
}) {
  const [roleState, changeRole] = useActionState(setMemberRole, undefined);
  const [removeState, remove] = useActionState(removeMember, undefined);
  const error = (roleState && !roleState.ok && roleState.error) || (removeState && !removeState.ok && removeState.error);
  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={name} className="size-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {name}
            {isYou && <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        {editable ? (
          <>
            <form action={changeRole}>
              <input type="hidden" name="userId" value={userId} />
              <label htmlFor={`role-${userId}`} className="sr-only">
                Role for {name}
              </label>
              <Select
                id={`role-${userId}`}
                name="role"
                defaultValue={role}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-9 w-32"
              >
                <option value="admin">Admin</option>
                <option value="rep">Sales rep</option>
              </Select>
            </form>
            <form action={remove}>
              <input type="hidden" name="userId" value={userId} />
              <button
                type="submit"
                aria-label={`Remove ${name} from the workspace`}
                className="inline-flex size-9 items-center justify-center rounded-lg text-subtle hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <Badge tone={role === "owner" ? "accent" : "neutral"}>{ROLE_LABEL[role]}</Badge>
        )}
      </div>
      {error && <p className="mt-1.5 pl-12 text-sm text-danger">{error}</p>}
      {roleState?.ok && <p className="mt-1.5 pl-12 text-sm text-success">Role updated.</p>}
    </li>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <Field label="Email address" htmlFor="invite-email" error={fields?.email}>
          <Input id="invite-email" name="email" type="email" placeholder="teammate@company.com" aria-invalid={!!fields?.email} />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="rep">
            <option value="rep">Sales rep</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
      </div>
      <SubmitButton size="sm" pendingText="Creating…">
        Create invitation
      </SubmitButton>
    </form>
  );
}

export function PendingInvite({
  id,
  email,
  role,
  link,
  expires,
}: {
  id: string;
  email: string;
  role: string;
  link: string;
  expires: string;
}) {
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted">
            {role} · expires {expires}
          </p>
        </div>
        <form action={revokeInvite}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="rounded-md px-2 py-1 text-sm text-muted hover:bg-danger-soft hover:text-danger">
            Revoke
          </button>
        </form>
      </div>
      <CopyField label={`Invite link for ${email}`} value={link} />
    </li>
  );
}
