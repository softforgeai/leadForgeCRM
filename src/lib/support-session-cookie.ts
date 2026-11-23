/**
 * Format of the support-session cookie. Kept free of server-only imports so
 * the proxy (src/proxy.ts) can read the expiry too. The cookie is httpOnly and
 * only ever written by the server.
 */

export const SUPPORT_SESSION_COOKIE = "lf_support";

export type SupportStash = {
  /** impersonation_sessions.id */
  sid: string;
  /** The admin's own tokens, restored on exit. */
  at: string;
  rt: string;
  /** The admin's previously selected workspace (lf_ws), restored on exit. */
  ws: string | null;
  /** Expiry, ms since epoch. The proxy ends sessions past this point. */
  exp: number;
};

export function encodeStash(stash: SupportStash): string {
  return Buffer.from(JSON.stringify(stash)).toString("base64url");
}

export function decodeStash(raw: string | undefined): SupportStash | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof v?.sid === "string" && typeof v.at === "string" && typeof v.rt === "string" && typeof v.exp === "number") {
      return { sid: v.sid, at: v.at, rt: v.rt, ws: typeof v.ws === "string" ? v.ws : null, exp: v.exp };
    }
  } catch {
    // Malformed cookie: treat as absent.
  }
  return null;
}
