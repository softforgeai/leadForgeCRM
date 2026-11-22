"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/app/app/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input } from "@/components/ui";

export function CreateWorkspaceForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(createWorkspace, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <Field label="Company or team name" htmlFor="workspaceName" error={fields?.workspaceName}>
        <Input id="workspaceName" name="workspaceName" placeholder="Brightline Agency" required autoFocus />
      </Field>
      <Field label="Your name" htmlFor="displayName" error={fields?.displayName} hint="Shown to your teammates.">
        <Input id="displayName" name="displayName" defaultValue={defaultName} autoComplete="name" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating workspace…">
        Create workspace
      </SubmitButton>
    </form>
  );
}
