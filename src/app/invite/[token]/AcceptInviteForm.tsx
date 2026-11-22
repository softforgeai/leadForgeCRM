"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/app/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input } from "@/components/ui";

export function AcceptInviteForm({ token, defaultName, email }: { token: string; defaultName: string; email: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      {fields?.token && <Alert>This invitation link is not valid.</Alert>}
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-fg">{email}</span>. The invitation must have been sent to this
        address.
      </p>
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" htmlFor="displayName" error={fields?.displayName}>
        <Input id="displayName" name="displayName" defaultValue={defaultName} required />
      </Field>
      <SubmitButton className="w-full" pendingText="Joining…">
        Join workspace
      </SubmitButton>
    </form>
  );
}
