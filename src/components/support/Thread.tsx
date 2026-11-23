import { Lock } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import type { SupportMessage } from "@/lib/database.types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

/**
 * A support conversation. Used by both the customer and the staff view; the
 * customer view never receives internal notes (RLS filters them out).
 */
export function Thread({ messages, viewer }: { messages: SupportMessage[]; viewer: "customer" | "staff" }) {
  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const label = m.is_staff ? (viewer === "customer" ? "LeadForge Support" : "Staff") : "Customer";
        return (
          <li
            key={m.id}
            className={cn(
              "rounded-xl border p-4",
              m.is_internal
                ? "border-dashed border-warning/40 bg-warning-soft/40"
                : m.is_staff
                  ? "border-accent/25 bg-accent-soft/40"
                  : "border-line bg-surface",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Avatar name={m.author_name} />
              <span className="font-medium">{m.author_name}</span>
              <Badge tone={m.is_staff ? "accent" : "neutral"}>{label}</Badge>
              {m.is_internal && (
                <Badge tone="warning">
                  <Lock aria-hidden className="mr-1 size-3" /> Internal note
                </Badge>
              )}
              <time dateTime={m.created_at} className="ml-auto text-xs text-subtle">
                {formatDate(m.created_at, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
            <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-fg">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
