"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "./actions";

function FormMessages({ state }: { state: AuthState }) {
  if (state?.error) return <Alert>{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

const LINK_ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Please try again.",
};

export function LoginForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(signIn, undefined);
  const linkError = LINK_ERRORS[params.get("error") ?? ""];
  const demoUnavailable = params.get("demo") === "unavailable";

  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && <Alert>{linkError}</Alert>}
      {demoUnavailable && <Alert tone="warning">The demo is unavailable right now. Please try again later.</Alert>}
      <FormMessages state={state} />
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      <Field label="Email" htmlFor="email" error={state?.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fields?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state?.fields?.password}
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent-text hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(signUp, undefined);
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      <Field label="Your name" htmlFor="name" error={state?.fields?.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!state?.fields?.name} />
      </Field>
      <Field label="Work email" htmlFor="email" error={state?.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state?.fields?.email} />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={state?.fields?.password}
        hint="At least 10 characters, with a letter and a number."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state?.fields?.password}
        />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <Field label="Email" htmlFor="email" error={state?.fields?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <Field
        label="New password"
        htmlFor="password"
        error={state?.fields?.password}
        hint="At least 10 characters, with a letter and a number."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">Update password</SubmitButton>
    </form>
  );
}
