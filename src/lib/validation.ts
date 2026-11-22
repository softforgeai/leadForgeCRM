import { z } from "zod";

export const LEAD_SOURCES = ["website", "referral", "linkedin", "ads", "other"] as const;

export const SOURCE_LABELS: Record<(typeof LEAD_SOURCES)[number], string> = {
  website: "Website",
  referral: "Referral",
  linkedin: "LinkedIn",
  ads: "Ads",
  other: "Other",
};

/** Empty strings from forms become null so optional columns stay clean. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
  .transform((v) => (v === "" ? null : v))
  .optional()
  .transform((v) => v ?? null);

/** Accepts "1,250.50" or "$1250" and returns integer cents. */
export const moneyToCents = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return 0;
    const cleaned = v.replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 2500 or 2,500.00" });
      return z.NEVER;
    }
    const cents = Math.round(Number(cleaned) * 100);
    if (cents > 100_000_000_000) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return cents;
  });

export const tagsInput = z
  .string()
  .trim()
  .max(400)
  .optional()
  .transform((v) =>
    Array.from(
      new Set(
        (v ?? "")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .map((t) => t.slice(0, 30)),
      ),
    ).slice(0, 10),
  );

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  company: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  source: z.enum(LEAD_SOURCES).default("other"),
  value: moneyToCents,
  stageId: z.uuid("Choose a stage"),
  assignedTo: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  tags: tagsInput,
  notes: optionalText(5000),
});

export const activitySchema = z.object({
  leadId: z.uuid(),
  type: z.enum(["note", "call", "email"]),
  body: z.string().trim().min(1, "Write something first").max(5000),
});

export const followUpSchema = z.object({
  leadId: z.uuid(),
  task: z.string().trim().min(1, "Describe the follow-up").max(200),
  dueAt: z
    .string()
    .min(1, "Pick a date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date"),
  assignedTo: z.uuid().optional(),
});

export const publicFormSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{32}$/),
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Please enter a valid email")),
  company: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().max(2000).default(""),
  /** Honeypot: real people never see or fill this field. */
  website: z.string().max(0).optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  role: z.enum(["admin", "rep"]),
});

/** Turns a ZodError into { field: firstMessage } for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
