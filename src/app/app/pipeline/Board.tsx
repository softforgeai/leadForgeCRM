"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveLead } from "@/app/app/actions/leads";
import { Alert, Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

type BoardStage = { id: string; name: string; kind: "open" | "won" | "lost" };
type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  value_cents: number;
  stage_id: string;
  assigned_to: string | null;
  tags: string[];
};

export function Board({
  stages,
  leads,
  members,
}: {
  stages: BoardStage[];
  leads: BoardLead[];
  members: Record<string, string>;
}) {
  const [optimisticLeads, applyMove] = useOptimistic(leads, (current, move: { id: string; stageId: string }) =>
    current.map((l) => (l.id === move.id ? { ...l, stage_id: move.stageId } : l)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(id: string, stageId: string) {
    const lead = optimisticLeads.find((l) => l.id === id);
    if (!lead || lead.stage_id === stageId) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id, stageId });
      const result = await moveLead(id, stageId);
      if (result && !result.ok) setError(result.error ?? "We couldn't move that lead.");
    });
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-4">
          {stages.map((stage) => {
            const items = optimisticLeads.filter((l) => l.stage_id === stage.id);
            const total = items.reduce((sum, l) => sum + l.value_cents, 0);
            return (
              <section
                key={stage.id}
                aria-label={`${stage.name}, ${items.length} leads`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  setOver(stage.id);
                }}
                onDragLeave={() => setOver((o) => (o === stage.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setOver(null);
                  setDragging(null);
                  if (id) move(id, stage.id);
                }}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-surface-2/50 transition",
                  over === stage.id ? "border-accent bg-accent-soft/40" : "border-line",
                )}
              >
                <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 rounded-full",
                        stage.kind === "won" ? "bg-success" : stage.kind === "lost" ? "bg-subtle" : "bg-accent",
                      )}
                    />
                    <h2 className="text-sm font-semibold">{stage.name}</h2>
                    <span className="text-xs text-subtle">{items.length}</span>
                  </div>
                  <span className="text-xs tabular-nums text-muted">{formatMoney(total)}</span>
                </header>
                <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                  {items.map((lead) => (
                    <li
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(lead.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className={cn(
                        "cursor-grab rounded-lg border border-line bg-surface p-3 shadow-sm transition active:cursor-grabbing",
                        dragging === lead.id && "opacity-50",
                      )}
                    >
                      <Link href={`/app/leads/${lead.id}`} className="block font-medium hover:underline">
                        {lead.name}
                      </Link>
                      {lead.company && <p className="truncate text-sm text-muted">{lead.company}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium tabular-nums">{formatMoney(lead.value_cents)}</span>
                        {lead.assigned_to && members[lead.assigned_to] ? (
                          <span title={members[lead.assigned_to]}>
                            <Avatar name={members[lead.assigned_to]!} className="size-6 text-[10px]" />
                          </span>
                        ) : (
                          <span className="text-xs text-subtle">Unassigned</span>
                        )}
                      </div>
                      <label className="sr-only" htmlFor={`stage-${lead.id}`}>
                        Move {lead.name} to stage
                      </label>
                      <select
                        id={`stage-${lead.id}`}
                        value={lead.stage_id}
                        onChange={(e) => move(lead.id, e.target.value)}
                        className="mt-2 h-8 w-full rounded-md border border-line bg-surface-2 px-2 text-xs text-muted"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                  {items.length === 0 && (
                    <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line py-6 text-xs text-subtle">
                      No leads
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {leads.length >= 1000 && (
        <p className="text-xs text-subtle">Showing the 1,000 most recently updated leads. Use the Leads table to see all.</p>
      )}
    </div>
  );
}
