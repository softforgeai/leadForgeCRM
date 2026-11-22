"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation";

export type AuthState = { error?: string; fields?: Record<string, string>; message?: string } | undefined;

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password").max(72),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for wrong email and wrong password: don't reveal which accounts exist.
    if (error.code === "email_not_confirmed") return { error: "Please confirm your email first. Check your inbox." };
    return { error: "Incorrect email or password." };
  }
  redirect(safeNextPath(formData.get("next")));
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(72, "Use 72 characters or fewer")
    .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Include at least one letter and one number"),
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const next = safeNextPath(formData.get("next"), "/onboarding");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { fields: { password: error.message } };
    return { error: "We couldn't create your account. Please try again." };
  }
  // If email confirmation is turned off in Supabase, the user is signed in right away.
  if (data.session) redirect(next);
  return { message: "Check your email for a link to confirm your account." };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.email("Enter a valid email") }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });
  // Always the same response, whether or not the account exists.
  return { message: "If an account exists for that email, we've sent a reset link." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.pick({ password: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: "Your reset link has expired. Request a new one." };
  if (isDemoEmail(claims.claims.email)) return { error: "The demo account's password can't be changed." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We couldn't update your password. Try a different one." };
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** One-click demo login with a shared, read-mostly demo account. */
export async function signInAsDemo() {
  const { DEMO_EMAIL, DEMO_PASSWORD } = serverEnv();
  if (!DEMO_EMAIL || !DEMO_PASSWORD) redirect("/login?demo=unavailable");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (error) redirect("/login?demo=unavailable");
  redirect("/app");
}

function isDemoEmail(email: unknown) {
  const demo = process.env.DEMO_EMAIL;
  return Boolean(demo && typeof email === "string" && email.toLowerCase() === demo.toLowerCase());
}
