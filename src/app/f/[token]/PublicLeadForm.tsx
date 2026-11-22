"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { submitLeadForm } from "./actions";

export function PublicLeadForm({ token }: { token: string }) {
  const [state, action] = useActionState(submitLeadForm, undefined);

  if (state?.ok) {
    return (
      <div role="status" className="py-6 text-center">
        <p className="text-lg font-semibold">Thanks, we&apos;ve got your message.</p>
        <p className="mt-1 text-sm text-muted">Someone from the team will be in touch soon.</p>
      </div>
    );
  }

  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      {/* Honeypot: hidden from people and screen readers, often filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={fields?.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fields?.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={fields?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fields?.email} />
        </Field>
        <Field label="Company" htmlFor="company" error={fields?.company}>
          <Input id="company" name="company" autoComplete="organization" />
        </Field>
        <Field label="Phone" htmlFor="phone" error={fields?.phone}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
      </div>
      <Field label="How can we help?" htmlFor="message" error={fields?.message}>
        <Textarea id="message" name="message" rows={4} maxLength={2000} />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send message
      </SubmitButton>
    </form>
  );
}
