"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importLeads } from "@/app/app/actions/leads";
import { SubmitButton } from "@/components/SubmitButton";
import { Alert, Field, Input } from "@/components/ui";

export function ImportForm() {
  const [state, action] = useActionState(importLeads, undefined);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && <Alert>{state.error}</Alert>}
      {state?.ok && (
        <Alert tone="success">
          Imported {state.imported} {state.imported === 1 ? "lead" : "leads"}.{" "}
          <Link href="/app/leads" className="font-medium underline">
            View leads
          </Link>
        </Alert>
      )}
      {state?.ok && state.skipped.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          <p className="font-medium">Skipped {state.skipped.length} rows:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.skipped.map((s) => (
              <li key={s.row}>
                Row {s.row}: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label="CSV file" htmlFor="file">
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required className="h-auto py-2" />
      </Field>
      <SubmitButton pendingText="Importing…">Import leads</SubmitButton>
    </form>
  );
}
