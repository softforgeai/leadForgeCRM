import { z } from "zod";

/**
 * Public env vars. Next.js inlines NEXT_PUBLIC_* at build time, so each one
 * must be referenced literally (not via process.env[key]).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine(
      (v) => new URL(v).pathname.replace(/\/$/, "") === "",
      "NEXT_PUBLIC_SUPABASE_URL must be the base project URL (https://<ref>.supabase.co), without /rest/v1",
    ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});
