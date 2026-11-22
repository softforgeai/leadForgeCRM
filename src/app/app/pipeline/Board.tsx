"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Building2, Clock, Mail, MessageSquare, MoreHorizontal, Phone, Plus, Search } from "lucide-react";
import { moveLead } from "@/app/app/actions/leads";
import { Alert, Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney, formatRelative } from "@/lib/format";
import { FALLBACK_COLOR, stageColors } from "@/lib/stage-colors";

type BoardStage = { id: string; name: string; kind: "open" | "won" | "lost" };
type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  value_cents: number;
  stage_id: string;
  assigned_to: string | null;
  tags: string[];
  updated_at: string;
};
type Sort = "updated" | "value" | "oldest";

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export function Board({
  stages,
  leads,
  members,
  currentUserId,
  canFilterByOwner,
  now,
}: {
  stages: BoardStage[];
  leads: BoardLead[];
  members: { id: string; name: string }[];
  currentUserId: string;
  canFilterByOwner: boolean;
  now: number;
}) {
  const [optimisticLeads, applyMove] = useOptimistic(leads, (current, move: { id: string; stageId: string }) =>
    current.map((l) => (l.id === move.id ? { ...l, stage_id: move.stageId } : l)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState<Sort>("updated");

  const colors = useMemo(() => stageColors(stages), [stages]);
  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimisticLeads
      .filter((l) => {
        if (owner === "me" && l.assigned_to !== currentUserId) return false;
        if (owner === "none" && l.assigned_to !== null) return false;
        if (owner !== "all" && owner !== "me" && owner !== "none" && l.assigned_to !== owner) return false;
        if (!q) return true;
        return [l.name, l.company, l.email].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sort === "value") return b.value_cents - a.value_cents;
        const diff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return sort === "oldest" ? -diff : diff;
      });
  }, [optimisticLeads, query, owner, sort, currentUserId]);

  function move(id: string, stageId: string) {
    const lead = optimisticLeads.find((l) => l.id === id);
    if (!lead || lead.stage_id === stageId) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id, stageId });
      const result = await moveLead(id, stageId);
      if (result && !result.ok) setError(result.error ?? "We couldn't move that deal.");
    });
  }

  const filtered = query.trim() !== "" || owner !== "all";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <label htmlFor="board-search" className="sr-only">
            Search deals
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            id="board-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals"
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-8 text-sm placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
          />
        </div>
        <ToolbarSelect label="Owner" value={owner} onChange={setOwner}>
          <option value="all">All owners</option>
          <option value="me">My deals</option>
          {canFilterByOwner && (
            <>
              <option value="none">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </>
          )}
        </ToolbarSelect>
        <ToolbarSelect label="Sort" value={sort} onChange={(v) => setSort(v as Sort)}>
          <option value="updated">Recently updated</option>
          <option value="value">Highest value</option>
          <option value="oldest">Least recently updated</option>
        </ToolbarSelect>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOwner("all");
            }}
            className="text-sm text-accent-text hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Board: the only element that scrolls horizontally */}
      <div className="scroll-thin min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-[28rem] gap-3">
          {stages.map((stage) => {
            const color = colors.get(stage.id) ?? FALLBACK_COLOR;
            const items = visible.filter((l) => l.stage_id === stage.id);
            const total = items.reduce((sum, l) => sum + l.value_cents, 0);
            const isOver = over === stage.id;
            return (
              <section
                key={stage.id}
                aria-label={`${stage.name}, ${items.length} deals`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (over !== stage.id) setOver(stage.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === stage.id ? null : o));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setOver(null);
                  setDragging(null);
                  if (id) move(id, stage.id);
                }}
                className={cn(
                  "flex h-full w-[18.5rem] shrink-0 flex-col rounded-xl border bg-surface-2/70 transition-colors",
                  isOver ? "border-accent bg-accent-soft/60" : "border-line",
                )}
              >
                <header className={cn("rounded-t-xl border-t-[3px] bg-surface px-3 pt-2.5 pb-2", color.bar)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{stage.name}</h2>
                      <span className="rounded-full bg-surface-2 px-2 py-px text-xs font-medium text-muted">
                        {items.length}
                      </span>
                    </div>
                    <Link
                      href={`/app/leads/new?stage=${stage.id}`}
                      aria-label={`Add a deal to ${stage.name}`}
                      className="inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
                    >
                      <Plus aria-hidden className="size-4" />
                    </Link>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-muted">{formatMoney(total)}</p>
                </header>

                <ul className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {items.map((lead) => (
                    <DealCard
                      key={lead.id}
                      lead={lead}
                      stages={stages}
                      ownerName={lead.assigned_to ? memberName.get(lead.assigned_to) : undefined}
                      stale={stage.kind === "open" && now - new Date(lead.updated_at).getTime() > STALE_AFTER_MS}
                      now={now}
                      dragging={dragging === lead.id}
                      onDragStart={() => setDragging(lead.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onMove={(stageId) => move(lead.id, stageId)}
                    />
                  ))}
                  {items.length === 0 && (
                    <li
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-10 text-center text-xs text-subtle",
                        isOver ? "border-accent/60" : "border-line",
                      )}
                    >
                      {filtered ? "No matching deals" : "Drop deals here"}
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {leads.length >= 1000 && (
        <p className="text-xs text-subtle">Showing the 1,000 most recently updated deals. Use the list view to see all.</p>
      )}
    </div>
  );
}

function ToolbarSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface pl-3 text-sm">
      <span className="text-subtle">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full rounded-r-lg bg-transparent pr-2 font-medium focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function DealCard({
  lead,
  stages,
  ownerName,
  stale,
  now,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  lead: BoardLead;
  stages: BoardStage[];
  ownerName?: string;
  stale: boolean;
  now: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (stageId: string) => void;
}) {
  const extraTags = lead.tags.length - 2;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:border-line-strong hover:shadow-md active:cursor-grabbing",
        dragging && "rotate-1 opacity-60 shadow-lg",
      )}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/app/leads/${lead.id}`} className="min-w-0 font-medium leading-snug text-fg hover:text-accent-text">
            {lead.name}
          </Link>
          <MoveMenu lead={lead} stages={stages} onMove={onMove} />
        </div>
        {lead.company && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-muted">
            <Building2 aria-hidden className="size-3.5 shrink-0 text-subtle" />
            <span className="truncate">{lead.company}</span>
          </p>
        )}
        <p className="mt-2 text-[15px] font-semibold tabular-nums">{formatMoney(lead.value_cents)}</p>
        {lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {t}
              </span>
            ))}
            {extraTags > 0 && <span className="px-1 py-0.5 text-[11px] text-subtle">+{extraTags}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <div className="flex items-center gap-1">
          {ownerName ? (
            <span title={`Owner: ${ownerName}`}>
              <Avatar name={ownerName} className="size-6 text-[10px]" />
            </span>
          ) : (
            <span
              title="Unassigned"
              className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-line-strong text-[10px] text-subtle"
            >
              ?
            </span>
          )}
          <QuickAction href={lead.phone ? `tel:${lead.phone.replace(/[^\d+]/g, "")}` : undefined} label="Call" icon={Phone} />
          <QuickAction href={lead.email ? `mailto:${lead.email}` : undefined} label="Email" icon={Mail} />
          <QuickAction href={`/app/leads/${lead.id}`} label="Add a note" icon={MessageSquare} internal />
        </div>
        <span
          className={cn("inline-flex items-center gap-1 text-[11px]", stale ? "font-medium text-warning" : "text-subtle")}
          title={stale ? "No updates in over 14 days" : "Last updated"}
        >
          <Clock aria-hidden className="size-3" />
          {formatRelative(lead.updated_at, now).replace(/^in /, "")}
        </span>
      </div>
    </li>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  internal,
}: {
  href?: string;
  label: string;
  icon: typeof Phone;
  internal?: boolean;
}) {
  const cls = "inline-flex size-6 items-center justify-center rounded text-subtle";
  if (!href) {
    return (
      <span className={cn(cls, "opacity-35")} title={`No ${label === "Call" ? "phone number" : "email"}`}>
        <Icon aria-hidden className="size-3.5" />
      </span>
    );
  }
  const Comp = internal ? Link : "a";
  return (
    <Comp href={href} aria-label={label} title={label} className={cn(cls, "hover:bg-surface-2 hover:text-accent-text")}>
      <Icon aria-hidden className="size-3.5" />
    </Comp>
  );
}

/** Accessible "move to stage" menu: works on touch screens and with a keyboard. */
function MoveMenu({ lead, stages, onMove }: { lead: BoardLead; stages: BoardStage[]; onMove: (stageId: string) => void }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  // The menu is position: fixed so the scrolling column can't clip it; it
  // closes on outside click, Escape, scroll or resize.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const onScroll = () => setPos(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggle(button: HTMLButtonElement) {
    if (open) return setPos(null);
    const rect = button.getBoundingClientRect();
    const menuHeight = 40 + stages.length * 32 + 44;
    const width = 192;
    const below = rect.bottom + 4 + menuHeight <= window.innerHeight;
    setPos({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }

  return (
    <div ref={ref} className="shrink-0">
      <button
        type="button"
        aria-label={`Move ${lead.name} to stage`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => toggle(e.currentTarget)}
        className="-mt-0.5 -mr-1 inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg"
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>
      {pos && (
        <div
          role="menu"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">Move to</p>
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              disabled={s.id === lead.stage_id}
              onClick={() => {
                setPos(null);
                onMove(s.id);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2 disabled:cursor-default disabled:font-medium disabled:text-accent-text disabled:hover:bg-transparent"
            >
              {s.name}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <Link href={`/app/leads/${lead.id}`} role="menuitem" className="block px-3 py-1.5 text-sm hover:bg-surface-2">
            Open deal
          </Link>
        </div>
      )}
    </div>
  );
}
