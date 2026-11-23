import { NextResponse, type NextRequest } from "next/server";
import { endSupportSession } from "@/lib/impersonation";

/**
 * Ends a staff "log in as" session and restores the admin's own session.
 * GET is used by the proxy when a session expires; POST by the banner's form
 * fallback. Ending a session is the only effect, so there's nothing for a
 * cross-site request to abuse.
 */
async function handle(request: NextRequest) {
  const next = await endSupportSession();
  const url = new URL(next, request.url);
  if (request.nextUrl.searchParams.get("expired") === "1" && next.startsWith("/admin")) {
    url.searchParams.set("notice", "session-expired");
  }
  return NextResponse.redirect(url, { status: 303 });
}

export const GET = handle;
export const POST = handle;
