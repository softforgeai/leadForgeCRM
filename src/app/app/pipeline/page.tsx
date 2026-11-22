import Link from "next/link";
import { KanbanSquare, List, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { getBoardLeads, getMembers, getStages } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { Board } from "./Board";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const ctx = await requireWorkspace();
  const [stages, leads, members] = await Promise.all([
    getStages(ctx.workspace.id),
    getBoardLeads(ctx.workspace.id),
    getMembers(ctx.workspace.id),
  ]);
  const openStageIds = new Set(stages.filter((s) => s.kind === "open").map((s) => s.id));
  const openLeads = leads.filter((l) => openStageIds.has(l.stage_id));
  const openValue = openLeads.reduce((sum, l) => sum + l.value_cents, 0);
  const now = await requestTime();

  return (
    <div data-fullbleed className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted">
            Sales pipeline · {openLeads.length} open {openLeads.length === 1 ? "deal" : "deals"} worth{" "}
            <span className="font-medium text-fg">{formatMoney(openValue)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <span
              aria-current="page"
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-sm font-medium"
            >
              <KanbanSquare aria-hidden className="size-4" /> Board
            </span>
            <Link
              href="/app/leads"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:text-fg"
            >
              <List aria-hidden className="size-4" /> List
            </Link>
          </div>
          <ButtonLink href="/app/leads/new" size="sm">
            <Plus aria-hidden className="size-4" /> Add opportunity
          </ButtonLink>
        </div>
      </div>

      <Board
        stages={stages.map(({ id, name, kind }) => ({ id, name, kind }))}
        leads={leads}
        members={members.map((m) => ({ id: m.user_id, name: m.display_name }))}
        currentUserId={ctx.userId}
        canFilterByOwner={ctx.isManager}
        now={now}
      />
    </div>
  );
}

async function requestTime() {
  return Date.now();
}
