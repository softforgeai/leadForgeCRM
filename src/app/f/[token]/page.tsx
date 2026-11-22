import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicLeadForm } from "./PublicLeadForm";

export const metadata: Metadata = { title: "Get in touch", robots: { index: false, follow: false } };

export default function PublicFormPage({ params, searchParams }: PageProps<"/f/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <FormLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function FormLoader({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  // Reads only the workspace name, by its unguessable form token.
  const { data: workspace } = await createAdminClient()
    .from("workspaces")
    .select("name")
    .eq("form_token", token)
    .maybeSingle();
  if (!workspace) notFound();

  const embedded = sp.embed === "1";
  return (
    <main className={embedded ? "p-4" : "flex min-h-dvh items-start justify-center px-4 py-12 sm:py-20"}>
      <div className="w-full max-w-lg">
        {!embedded && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Contact {workspace.name}</h1>
            <p className="mt-1 text-sm text-muted">Tell us a little about what you need and we&apos;ll get back to you.</p>
          </>
        )}
        <div className={embedded ? "" : "mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6"}>
          <PublicLeadForm token={token} />
        </div>
        {!embedded && <p className="mt-6 text-center text-xs text-subtle">Powered by LeadForge</p>}
      </div>
    </main>
  );
}
