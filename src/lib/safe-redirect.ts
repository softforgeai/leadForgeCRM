/**
 * Only allow redirects to paths on this site. Blocks open redirects such as
 * ?next=https://evil.example or ?next=//evil.example.
 */
export function safeNextPath(next: unknown, fallback = "/app"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
