export type ActionState =
  | { ok: true; message?: string; at?: number }
  | { ok: false; error?: string; fields?: Record<string, string>; at?: number }
  | undefined;

export const ok = (message?: string): ActionState => ({ ok: true, message, at: Date.now() });
export const fail = (error: string, fields?: Record<string, string>): ActionState => ({
  ok: false,
  error,
  fields,
  at: Date.now(),
});
export const invalid = (fields: Record<string, string>): ActionState => ({ ok: false, fields, at: Date.now() });

/**
 * Maps database errors to messages that are safe to show. Raw Postgres errors
 * can leak schema details, so only known, user-facing exceptions pass through.
 */
const SAFE_DB_MESSAGES = [
  "workspace limit reached",
  "invitation not found or expired",
  "this invitation was sent to a different email address",
  "ownership cannot be granted here",
  "you cannot change your own role",
  "the owner's role cannot be changed",
  "you cannot remove yourself",
  "the owner cannot be removed",
  "member not found",
  "not allowed",
  "too many tickets today",
  "too many messages, try again later",
  "ticket not found",
];

export function dbErrorMessage(error: { message?: string; code?: string } | null, fallback: string): string {
  if (!error) return fallback;
  const msg = (error.message ?? "").toLowerCase();
  const known = SAFE_DB_MESSAGES.find((m) => msg.includes(m));
  if (known) return known.charAt(0).toUpperCase() + known.slice(1) + ".";
  if (error.code === "42501") return "You don't have permission to do that.";
  if (error.code === "23503") return "That item is still in use, so it can't be removed.";
  if (error.code === "23505") return "That already exists.";
  console.error("[db]", error);
  return fallback;
}
