"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
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
import { Alert, Badge, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="success">{state.message}</Alert> : null;
  return state.error ? <Alert>{state.error}</Alert> : null;
}

export function WorkspaceForm({ name, logoUrl, disabled }: { name: string; logoUrl: string; disabled: boolean }) {
  const [state, action] = useActionState(updateWorkspace, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <fieldset disabled={disabled} className="space-y-4">
        <Field label="Workspace name" htmlFor="ws-name" error={fields?.name}>
          <Input id="ws-name" name="name" defaultValue={name} />
        </Field>
        <Field label="Logo URL" htmlFor="ws-logo" error={fields?.logoUrl} hint="Optional. An https:// link to an image.">
          <Input id="ws-logo" name="logoUrl" type="url" defaultValue={logoUrl} placeholder="https://" />
        </Field>
        <SubmitButton size="sm">Save</SubmitButton>
      </fieldset>
    </form>
  );
}

export function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const id = `copy-${label.toLowerCase().replace(/\s+/g, "-")}`;
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
          aria-label={`Copy ${label.toLowerCase()}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line-strong text-muted hover:text-fg"
        >
          {copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export function RegenerateFormLink() {
  const [state, action] = useActionState(regenerateFormLink, undefined);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <SubmitButton variant="secondary" size="sm" pendingText="Creating…">
        Create a new link (disables the old one)
      </SubmitButton>
    </form>
  );
}

type StageRow = { id: string; name: string; kind: "open" | "won" | "lost" };

function StageItem({ stage, disabled }: { stage: StageRow; disabled: boolean }) {
  const [renameState, rename] = useActionState(renameStage, undefined);
  const [deleteState, remove] = useActionState(deleteStage, undefined);
  const error =
    (renameState && !renameState.ok && (renameState.error ?? renameState.fields?.name)) ||
    (deleteState && !deleteState.ok && deleteState.error);
  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <form action={rename} className="flex flex-1 gap-2">
          <input type="hidden" name="id" value={stage.id} />
          <label htmlFor={`stage-${stage.id}`} className="sr-only">
            Stage name
          </label>
          <Input id={`stage-${stage.id}`} name="name" defaultValue={stage.name} disabled={disabled} className="h-9" />
          {!disabled && (
            <SubmitButton variant="secondary" size="sm" pendingText="…">
              Rename
            </SubmitButton>
          )}
        </form>
        {stage.kind !== "open" ? (
          <Badge tone={stage.kind === "won" ? "success" : "neutral"}>{stage.kind === "won" ? "Won" : "Lost"}</Badge>
        ) : (
          !disabled && (
            <form action={remove}>
              <input type="hidden" name="id" value={stage.id} />
              <button
                type="submit"
                aria-label={`Remove stage ${stage.name}`}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </form>
          )
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </li>
  );
}

export function StageEditor({ stages, disabled }: { stages: StageRow[]; disabled: boolean }) {
  const [state, action] = useActionState(addStage, undefined);
  return (
    <div>
      <ul className="divide-y divide-line">
        {stages.map((s) => (
          <StageItem key={s.id} stage={s} disabled={disabled} />
        ))}
      </ul>
      {!disabled && (
        <form action={action} className="mt-4 space-y-2">
          <Feedback state={state && !state.ok ? state : undefined} />
          <div className="flex gap-2">
            <label htmlFor="new-stage" className="sr-only">
              New stage name
            </label>
            <Input id="new-stage" name="name" placeholder="New stage, e.g. Negotiation" className="h-9" />
            <SubmitButton size="sm">Add stage</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

export function MemberRow({
  userId,
  name,
  email,
  role,
}: {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "rep";
}) {
  const [roleState, changeRole] = useActionState(setMemberRole, undefined);
  const [removeState, remove] = useActionState(removeMember, undefined);
  const error = (roleState && !roleState.ok && roleState.error) || (removeState && !removeState.ok && removeState.error);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <form action={changeRole} className="flex gap-2">
          <input type="hidden" name="userId" value={userId} />
          <label htmlFor={`role-${userId}`} className="sr-only">
            Role for {name}
          </label>
          <Select id={`role-${userId}`} name="role" defaultValue={role} className="h-9 w-32">
            <option value="admin">Admin</option>
            <option value="rep">Sales rep</option>
          </Select>
          <SubmitButton variant="secondary" size="sm" pendingText="…">
            Update
          </SubmitButton>
        </form>
        <form action={remove}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            aria-label={`Remove ${name} from the workspace`}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </form>
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </li>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="mt-4 space-y-3">
      <Feedback state={state} />
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <div>
          <label htmlFor="invite-email" className="sr-only">
            Email
          </label>
          <Input id="invite-email" name="email" type="email" placeholder="teammate@company.com" aria-invalid={!!fields?.email} />
          {fields?.email && <p className="mt-1 text-sm text-danger">{fields.email}</p>}
        </div>
        <label htmlFor="invite-role" className="sr-only">
          Role
        </label>
        <Select id="invite-role" name="role" defaultValue="rep">
          <option value="rep">Sales rep</option>
          <option value="admin">Admin</option>
        </Select>
        <SubmitButton>Create invite</SubmitButton>
      </div>
    </form>
  );
}

export function PendingInvite({ id, email, role, link }: { id: string; email: string; role: string; link: string }) {
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm">
          <span className="font-medium">{email}</span> <span className="text-muted">· {role} · pending</span>
        </p>
        <form action={revokeInvite}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="text-xs text-muted hover:text-danger">
            Revoke
          </button>
        </form>
      </div>
      <div className="mt-2">
        <CopyField label={`Invite link for ${email}`} value={link} />
      </div>
    </li>
  );
}
