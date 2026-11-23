import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPPORT_SESSION_COOKIE, decodeStash } from "@/lib/support-session-cookie";

const SUPPORT_SESSION_END = "/admin/support-session/end";

/**
 * Refreshes the Supabase session cookie on each request and does an optimistic
 * redirect for signed-out users. Real authorization happens in the data layer
 * (src/lib/auth.ts) and in Postgres RLS, never only here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  // Match whole path segments: a plain startsWith("/app") would also catch
  // public files such as /apple-icon.
  const isPrivate = ["/app", "/onboarding", "/admin"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!signedIn && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // A staff "log in as" session past its expiry: hand the browser back to the
  // admin before anything else renders as the customer.
  const stash = decodeStash(request.cookies.get(SUPPORT_SESSION_COOKIE)?.value);
  if (stash && Date.now() > stash.exp && pathname !== SUPPORT_SESSION_END) {
    const url = request.nextUrl.clone();
    url.pathname = SUPPORT_SESSION_END;
    url.search = "?expired=1";
    const redirect = NextResponse.redirect(url);
    // Keep any session cookies refreshed above, so the end route can revoke it.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
