"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { fail, invalid, ok, type ActionState } from "@/lib/action-result";
import { serverEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, publicFormSchema } from "@/lib/validation";

/** Hashes the visitor's IP with a secret salt so raw IPs are never stored. */
async function visitorHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${serverEnv().IP_HASH_SALT}:${ip}`).digest("hex");
}

export async function submitLeadForm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = publicFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // Bots that fill the hidden honeypot get a fake success and nothing is saved.
    if (fields.website) return ok();
    if (fields.token) return fail("This form is no longer available.");
    return invalid(fields);
  }
  const d = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_lead_form", {
    p_token: d.token,
    p_name: d.name,
    p_email: d.email,
    p_company: d.company,
    p_phone: d.phone,
    p_message: d.message,
    p_ip_hash: await visitorHash(),
  });
  if (error) {
    if (error.message.includes("rate_limited")) {
      return fail("You've sent several messages already. Please try again later.");
    }
    if (error.message.includes("form not found")) return fail("This form is no longer available.");
    console.error("[lead-form]", error.code);
    return fail("Something went wrong. Please try again.");
  }
  return ok();
}
