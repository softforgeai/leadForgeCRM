"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTicket, replyToTicket } from "@/app/app/actions/support";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { CATEGORY_LABEL, PRIORITY_LABEL, TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/support";

export function NewTicketForm({ defaultPage }: { defaultPage?: string }) {
  const [state, action] = useActionState(createTicket, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-5">
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <Field label="Subject" htmlFor="t-subject" error={fields?.subject}>
        <Input
          id="t-subject"
          name="subject"
          required
          maxLength={150}
          placeholder="e.g. Leads from my website form aren't showing up"
          aria-invalid={Boolean(fields?.subject)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" htmlFor="t-category" error={fields?.category}>
          <Select id="t-category" name="category" defaultValue="question">
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="How urgent is it?"
          htmlFor="t-priority"
          error={fields?.priority}
          hint="Urgent means you can't work at all."
        >
          <Select id="t-priority" name="priority" defaultValue="normal">
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="What's happening?"
        htmlFor="t-body"
        error={fields?.body}
        hint="What you did, what you expected, and what happened instead. The more detail, the faster we can help."
      >
        <Textarea id="t-body" name="body" rows={7} required maxLength={5000} aria-invalid={Boolean(fields?.body)} />
      </Field>
      <Field
        label="Where did it happen? (optional)"
        htmlFor="t-page"
        error={fields?.pageUrl}
        hint="The page or feature, for example Pipeline or Settings → Team."
      >
        <Input id="t-page" name="pageUrl" maxLength={500} defaultValue={defaultPage} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Sending…">Send to support</SubmitButton>
      </div>
    </form>
  );
}

export function ReplyForm({ ticketId, placeholder }: { ticketId: string; placeholder?: string }) {
  const [state, action] = useActionState(replyToTicket, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fields = state && !state.ok ? state.fields : undefined;
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <label htmlFor="reply-body" className="sr-only">
        Your reply
      </label>
      <Textarea
        id="reply-body"
        name="body"
        rows={4}
        required
        maxLength={5000}
        placeholder={placeholder ?? "Write a reply…"}
        aria-invalid={Boolean(fields?.body)}
      />
      {fields?.body && <p className="text-sm text-danger">{fields.body}</p>}
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingText="Sending…">
          Send reply
        </SubmitButton>
      </div>
    </form>
  );
}
