import { ShieldAlert } from "lucide-react";
import { exitSupportSession } from "@/app/app/actions/support-session";
import { getUserTimeZone } from "@/lib/data";
import { getActiveSupportSession } from "@/lib/impersonation";
import { formatDate } from "@/lib/format";

/**
 * Shown on every app page while LeadForge staff are logged in as a customer,
 * so it's never unclear whose account is in use.
 */
export async function SupportSessionBanner() {
  const session = await getActiveSupportSession();
  if (!session) return null;
  const { tz } = await getUserTimeZone();
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-amber-500 px-4 py-2 text-sm text-amber-950"
    >
      <ShieldAlert aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Support mode.</strong> You&apos;re signed in as{" "}
        <strong className="font-semibold">{session.customerName}</strong> ({session.customerEmail})
        {session.workspaceName && <> in {session.workspaceName}</>}. Everything you do is done as them.{" "}
        <span className="opacity-80">
          {session.expired
            ? "This session has expired."
            : `Ends at ${formatDate(session.expiresAt, { timeStyle: "short", timeZone: tz })}.`}{" "}
          Reason: {session.reason}
        </span>
      </p>
      <form action={exitSupportSession}>
        <button
          type="submit"
          className="rounded-md bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900"
        >
          Exit support mode
        </button>
      </form>
    </div>
  );
}
