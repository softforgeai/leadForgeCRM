"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowRightLeft, CircleCheck, Mail, MessageSquare, Phone, Plus, Sparkles, UserRound } from "lucide-react";
import { addActivity, createFollowUp, moveLead, toggleFollowUp } from "@/app/app/actions/leads";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Activity, FollowUp } from "@/lib/database.types";
import { formatDate, formatRelative } from "@/lib/format";

type PathStage = { id: string; name: string; kind: "open" | "won" | "lost" };

/**
 * Stage progress bar across the top of the lead page. Click a step to move the
 * lead there. Won and Lost are shown together as the closing step.
 */
export function StagePath({
  leadId,
  currentStageId,
  stages,
}: {
  leadId: string;
  currentStageId: string;
  stages: PathStage[];
}) {
  const [optimisticStage, setOptimisticStage] = useOptimistic(currentStageId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currentIndex = stages.findIndex((s) => s.id === optimisticStage);
  const current = stages[currentIndex];

  function go(stageId: string) {
    if (stageId === optimisticStage) return;
    setError(null);
    startTransition(async () => {
      setOptimisticStage(stageId);
      const result = await moveLead(leadId, stageId);
      if (result && !result.ok) setError(result.error ?? "We couldn't move this lead.");
    });
  }

  return (
    <div className="space-y-2">
      <ol aria-label="Pipeline stage" className="flex overflow-x-auto rounded-xl border border-line bg-surface p-1 scroll-thin" aria-busy={pending}>
        {stages.map((s, i) => {
          const isCurrent = s.id === optimisticStage;
          const done = current?.kind === "open" ? i < currentIndex : current?.kind === "won" ? s.kind !== "lost" : false;
          const tone = isCurrent
            ? s.kind === "won"
              ? "bg-success text-white"
              : s.kind === "lost"
                ? "bg-danger text-white"
                : "bg-accent text-accent-fg"
            : done
              ? "bg-accent-soft text-accent-text"
              : "text-muted hover:bg-surface-2 hover:text-fg";
          return (
            <li key={s.id} className="min-w-28 flex-1">
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  tone,
                )}
              >
                {done && !isCurrent && <CircleCheck aria-hidden className="size-3.5" />}
                {s.name}
              </button>
            </li>
          );
        })}
      </ol>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

const TYPES = [
  { value: "note", label: "Note", icon: MessageSquare },
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
] as const;

export function ActivityComposer({ leadId }: { leadId: string }) {
  const [state, action] = useActionState(addActivity, undefined);
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("note");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="type" value={type} />
      <div role="radiogroup" aria-label="Activity type" className="flex gap-1">
        {TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm",
              type === value ? "bg-accent-soft font-medium text-accent-text" : "text-muted hover:bg-surface-2",
            )}
          >
            <Icon aria-hidden className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      <label htmlFor="activity-body" className="sr-only">
        Details
      </label>
      <Textarea
        id="activity-body"
        name="body"
        rows={3}
        placeholder={type === "call" ? "What was discussed on the call?" : type === "email" ? "Summarise the email" : "Add a note"}
        aria-invalid={!!fields?.body}
      />
      {fields?.body && <p className="text-sm text-danger">{fields.body}</p>}
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <SubmitButton size="sm" pendingText="Adding…">
        Add to timeline
      </SubmitButton>
    </form>
  );
}

const ICONS = {
  created: Sparkles,
  note: MessageSquare,
  call: Phone,
  email: Mail,
  stage_change: ArrowRightLeft,
  assigned: UserRound,
  follow_up: CircleCheck,
} as const;

function describe(a: Activity, actor: string): string {
  const meta = (a.meta ?? {}) as Record<string, string | undefined>;
  switch (a.type) {
    case "created":
      return meta.source === "website" ? "Lead came in from the website form" : `${actor} created this lead`;
    case "stage_change":
      return `${actor} moved this lead from ${meta.from ?? "?"} to ${meta.to ?? "?"}`;
    case "assigned":
      return meta.to ? `${actor} assigned this lead to ${meta.to}` : `${actor} unassigned this lead`;
    case "call":
      return `${actor} logged a call`;
    case "email":
      return `${actor} logged an email`;
    default:
      return `${actor} added a note`;
  }
}

export function Timeline({
  activities,
  names,
  now,
}: {
  activities: Activity[];
  names: Record<string, string>;
  now: number;
}) {
  if (activities.length === 0) return <p className="mt-6 text-sm text-muted">No activity yet.</p>;
  return (
    <ol className="mt-6 space-y-5">
      {activities.map((a) => {
        const Icon = ICONS[a.type];
        const actor = a.actor_id ? (names[a.actor_id] ?? "A former member") : "Someone";
        return (
          <li key={a.id} className="flex gap-3">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Icon aria-hidden className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {describe(a, actor)}{" "}
                <time dateTime={a.created_at} title={formatDate(a.created_at, { dateStyle: "medium", timeStyle: "short" })} className="text-subtle">
                  · {formatRelative(a.created_at, now)}
                </time>
              </p>
              {a.body && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm">{a.body}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function FollowUpList({
  followUps,
  names,
  now,
}: {
  followUps: FollowUp[];
  names: Record<string, string>;
  /** Render time from the server, so server and client agree on "overdue". */
  now: number;
}) {
  if (followUps.length === 0) return <p className="text-sm text-muted">No follow-ups scheduled.</p>;
  return (
    <ul className="space-y-2">
      {followUps.map((f) => {
        const overdue = !f.completed_at && new Date(f.due_at).getTime() < now;
        return (
          <li key={f.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
            <form action={toggleFollowUp}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="done" value={String(!f.completed_at)} />
              <button
                type="submit"
                aria-label={f.completed_at ? `Mark "${f.task}" as not done` : `Mark "${f.task}" as done`}
                className={cn(
                  "mt-0.5 inline-flex size-5 items-center justify-center rounded-full border",
                  f.completed_at ? "border-success bg-success text-white" : "border-line-strong hover:border-accent",
                )}
              >
                {f.completed_at && <CircleCheck aria-hidden className="size-3.5" />}
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", f.completed_at && "text-subtle line-through")}>{f.task}</p>
              <p className={cn("text-xs", overdue ? "font-medium text-danger" : "text-subtle")}>
                {overdue ? "Overdue · " : ""}
                {formatDate(f.due_at, { dateStyle: "medium", timeStyle: "short" })} · {names[f.assigned_to] ?? "—"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FollowUpForm({
  leadId,
  members,
  currentUserId,
}: {
  leadId: string;
  members: { value: string; label: string }[];
  currentUserId: string;
}) {
  const [state, action] = useActionState(createFollowUp, undefined);
  const [open, setOpen] = useState(false);
  const [tzOffset, setTzOffset] = useState(0);
  const [handled, setHandled] = useState(state);

  // Close the form after a successful save (adjusting state during render,
  // rather than in an effect, avoids an extra render pass).
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setTzOffset(new Date().getTimezoneOffset());
          setOpen(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
      >
        <Plus aria-hidden className="size-4" /> Schedule a follow-up
      </button>
    );
  }

  const fields = state && !state.ok ? state.fields : undefined;
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line pt-4">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="tzOffset" value={tzOffset} />
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      <Field label="Task" htmlFor="task" error={fields?.task}>
        <Input id="task" name="task" placeholder="Call back about the proposal" autoFocus />
      </Field>
      <Field label="Due" htmlFor="dueAt" error={fields?.dueAt}>
        <Input id="dueAt" name="dueAt" type="datetime-local" />
      </Field>
      {members.length > 0 && (
        <Field label="Assign to" htmlFor="fu-assignedTo">
          <Select id="fu-assignedTo" name="assignedTo" defaultValue={currentUserId}>
            {members.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex gap-2">
        <SubmitButton size="sm">Schedule</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-muted hover:text-fg">
          Cancel
        </button>
      </div>
    </form>
  );
}
