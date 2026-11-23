"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { replyAsStaff, startSupportSession, updateTicket } from "@/app/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Select, Textarea, buttonClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import type { TicketPriorityT, TicketStatusT } from "@/lib/database.types";
import { PRIORITY_LABEL, STAFF_STATUS_LABEL, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="success">{state.message}</Alert> : null;
  return state.error ? <Alert>{state.error}</Alert> : null;
}

/**
 * "Log in as" with a required reason. Opens a small panel instead of acting
 * on one click, so it's always a deliberate, recorded decision.
 */
export function LoginAsButton({
  userId,
  workspaceId,
  name,
  defaultReason,
  disabledReason,
  size = "sm",
}: {
  userId: string;
  workspaceId: string;
  name: string;
  defaultReason?: string;
  /** When set, the button is disabled and this explains why. */
  disabledReason?: string;
  size?: "sm" | "md";
}) {
  const [state, action] = useActionState(startSupportSession, undefined);
  const [open, setOpen] = useState(false);
  const fields = state && !state.ok ? state.fields : undefined;
  const id = `reason-${userId}`;

  if (disabledReason) {
    return (
      <span title={disabledReason} className={buttonClass("secondary", size, "cursor-not-allowed opacity-50")}>
        <LogIn aria-hidden className="size-4" /> Log in as
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={buttonClass("secondary", size)}
      >
        <LogIn aria-hidden className="size-4" /> Log in as
      </button>
      {open && (
        <form
          action={action}
          className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-line bg-surface p-4 text-left shadow-lg"
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <p className="text-sm">
            You&apos;ll see LeadForge exactly as <strong className="font-medium">{name}</strong> does, and anything you
            change is done as them. The session ends after 60 minutes and is recorded in the audit log.
          </p>
          {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
          <Field label="Reason" htmlFor={id} error={fields?.reason}>
            <Textarea
              id={id}
              name="reason"
              rows={2}
              required
              minLength={5}
              maxLength={300}
              defaultValue={defaultReason}
              placeholder="e.g. Ticket #1004: pipeline board won't load"
              aria-invalid={Boolean(fields?.reason)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>
              Cancel
            </button>
            <SubmitButton size="sm" pendingText="Opening…">
              Start support session
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

export function StaffReplyForm({ ticketId, status }: { ticketId: string; status: TicketStatusT }) {
  const [state, action] = useActionState(replyAsStaff, undefined);
  const [internal, setInternal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fields = state && !state.ok ? state.fields : undefined;
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Feedback state={state} />
      <label htmlFor="staff-reply" className="sr-only">
        Reply
      </label>
      <Textarea
        id="staff-reply"
        name="body"
        rows={5}
        required
        maxLength={5000}
        placeholder={internal ? "Note for the team. The customer won't see this." : "Reply to the customer…"}
        aria-invalid={Boolean(fields?.body)}
        className={internal ? "border-warning/50 bg-warning-soft/30" : undefined}
      />
      {fields?.body && <p className="text-sm text-danger">{fields.body}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="internal"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="size-4 rounded border-line-strong accent-amber-500"
          />
          Internal note
        </label>
        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor="reply-status" className="text-sm text-muted">
            Then set status
          </label>
          <Select
            id="reply-status"
            name="status"
            defaultValue={status === "open" ? "waiting_on_customer" : ""}
            className="h-8 w-auto py-0 text-sm"
          >
            <option value="">Keep ({STAFF_STATUS_LABEL[status]})</option>
            {TICKET_STATUSES.filter((s) => s !== status).map((s) => (
              <option key={s} value={s}>
                {STAFF_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <SubmitButton size="sm" pendingText="Sending…">
            {internal ? "Add note" : "Send reply"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function TicketControls({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: TicketStatusT;
  priority: TicketPriorityT;
}) {
  const [state, action] = useActionState(updateTicket, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Feedback state={state} />
      <Field label="Status" htmlFor="ticket-status">
        <Select id="ticket-status" name="status" defaultValue={status} key={`s-${status}`}>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STAFF_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Priority" htmlFor="ticket-priority">
        <Select id="ticket-priority" name="priority" defaultValue={priority} key={`p-${priority}`}>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton size="sm" variant="secondary" className="w-full">
        Update ticket
      </SubmitButton>
    </form>
  );
}
