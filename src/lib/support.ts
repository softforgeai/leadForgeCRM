import { z } from "zod";
import type { TicketCategoryT, TicketPriorityT, TicketStatusT } from "@/lib/database.types";

/** Labels and validation shared by the customer support pages and the admin inbox. */

export const TICKET_CATEGORIES = ["bug", "question", "billing", "feature_request", "account", "other"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] as const;

export const CATEGORY_LABEL: Record<TicketCategoryT, string> = {
  bug: "Something isn't working",
  question: "Question",
  billing: "Billing",
  feature_request: "Feature request",
  account: "Account & access",
  other: "Other",
};

export const PRIORITY_LABEL: Record<TicketPriorityT, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABEL: Record<TicketStatusT, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

/** Staff see the same statuses, phrased from their side. */
export const STAFF_STATUS_LABEL: Record<TicketStatusT, string> = {
  ...STATUS_LABEL,
  waiting_on_customer: "Waiting on customer",
};

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export const STATUS_TONE: Record<TicketStatusT, Tone> = {
  open: "accent",
  in_progress: "warning",
  waiting_on_customer: "neutral",
  resolved: "success",
  closed: "neutral",
};

export const PRIORITY_TONE: Record<TicketPriorityT, Tone> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export const isOpenStatus = (s: TicketStatusT) => s !== "resolved" && s !== "closed";

export const ticketRef = (n: number) => `#${n}`;

const body = z.string().trim().min(1, "Write a message").max(5000, "Use 5,000 characters or fewer");

export const newTicketSchema = z.object({
  subject: z.string().trim().min(3, "Use at least 3 characters").max(150, "Use 150 characters or fewer"),
  category: z.enum(TICKET_CATEGORIES, "Choose a category"),
  priority: z.enum(TICKET_PRIORITIES, "Choose a priority"),
  body: z.string().trim().min(10, "Describe the issue in a little more detail").max(5000, "Use 5,000 characters or fewer"),
  pageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const replySchema = z.object({ ticketId: z.uuid(), body });

export const staffReplySchema = z.object({
  ticketId: z.uuid(),
  body,
  internal: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  // Optional status to set along with the reply ("" keeps the current one).
  status: z.union([z.enum(TICKET_STATUSES), z.literal("")]).optional(),
});

export const ticketUpdateSchema = z.object({
  ticketId: z.uuid(),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
});
