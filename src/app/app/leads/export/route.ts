import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceContext } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { getAllLeadsForExport, getMembers, getStages, parseLeadFilters } from "@/lib/data";

/** Exports the current filtered lead list as CSV. RLS limits reps to their own leads. */
export async function GET(request: NextRequest) {
  const ctx = await getWorkspaceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = parseLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  const [leads, stages, members] = await Promise.all([
    getAllLeadsForExport(ctx.workspace.id, filters),
    getStages(ctx.workspace.id),
    getMembers(ctx.workspace.id),
  ]);
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const memberName = new Map(members.map((m) => [m.user_id, m.display_name]));

  const csv = toCsv([
    ["Name", "Company", "Email", "Phone", "Source", "Value", "Stage", "Assigned to", "Tags", "Notes", "Created"],
    ...leads.map((l) => [
      l.name,
      l.company,
      l.email,
      l.phone,
      l.source,
      (l.value_cents / 100).toFixed(2),
      stageName.get(l.stage_id),
      l.assigned_to ? memberName.get(l.assigned_to) : "",
      l.tags.join(", "),
      l.notes,
      l.created_at,
    ]),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leadforge-leads-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
