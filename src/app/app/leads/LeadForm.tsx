"use client";

import { useActionState } from "react";
import { createLead, updateLead } from "@/app/app/actions/leads";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import type { Lead } from "@/lib/database.types";
import { centsToInput } from "@/lib/format";
import { LEAD_SOURCES, SOURCE_LABELS } from "@/lib/validation";

type Option = { value: string; label: string };

export function LeadForm({
  lead,
  stages,
  members,
  canAssign,
  currentUserId,
  defaultStageId,
}: {
  defaultStageId?: string;
  lead?: Lead;
  stages: Option[];
  members: Option[];
  canAssign: boolean;
  currentUserId: string;
}) {
  const [state, action] = useActionState(lead ? updateLead : createLead, undefined);
  const fields = state && !state.ok ? state.fields : undefined;
  const err = (k: string) => fields?.[k];

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && state.error && <Alert>{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {lead && <input type="hidden" name="id" value={lead.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={err("name")}>
          <Input id="name" name="name" defaultValue={lead?.name} required aria-invalid={!!err("name")} />
        </Field>
        <Field label="Company" htmlFor="company" error={err("company")}>
          <Input id="company" name="company" defaultValue={lead?.company ?? ""} />
        </Field>
        <Field label="Email" htmlFor="email" error={err("email")}>
          <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} aria-invalid={!!err("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={err("phone")}>
          <Input id="phone" name="phone" type="tel" defaultValue={lead?.phone ?? ""} />
        </Field>
        <Field label="Stage" htmlFor="stageId" error={err("stageId")}>
          <Select id="stageId" name="stageId" defaultValue={lead?.stage_id ?? defaultStageId ?? stages[0]?.value}>
            {stages.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated deal value (USD)" htmlFor="value" error={err("value")}>
          <Input
            id="value"
            name="value"
            inputMode="decimal"
            placeholder="2,500"
            defaultValue={lead ? centsToInput(lead.value_cents) : ""}
            aria-invalid={!!err("value")}
          />
        </Field>
        <Field label="Source" htmlFor="source" error={err("source")}>
          <Select id="source" name="source" defaultValue={lead?.source ?? "other"}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Assigned to"
          htmlFor="assignedTo"
          error={err("assignedTo")}
          hint={canAssign ? undefined : "Sales reps' leads are assigned to themselves."}
        >
          <Select
            id="assignedTo"
            name="assignedTo"
            defaultValue={lead ? (lead.assigned_to ?? "") : currentUserId}
            disabled={!canAssign}
          >
            {canAssign && <option value="">Unassigned</option>}
            {members.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tags" htmlFor="tags" hint="Separate with commas, e.g. hot, retainer" error={err("tags")}>
        <Input id="tags" name="tags" defaultValue={lead?.tags.join(", ") ?? ""} />
      </Field>
      <Field label="Notes" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" name="notes" rows={4} defaultValue={lead?.notes ?? ""} />
      </Field>

      <SubmitButton>{lead ? "Save changes" : "Create lead"}</SubmitButton>
    </form>
  );
}
