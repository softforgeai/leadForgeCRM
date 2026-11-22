import "server-only";
import { z } from "zod";

/** Server-only secrets. Importing this from a client component fails the build. */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  /** Salt for hashing visitor IPs before they're stored for rate limiting. */
  IP_HASH_SALT: z.string().min(16),
  DEMO_EMAIL: z.email().optional(),
  DEMO_PASSWORD: z.string().min(8).optional(),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
    DEMO_EMAIL: process.env.DEMO_EMAIL || undefined,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD || undefined,
  });
  return cached;
}
