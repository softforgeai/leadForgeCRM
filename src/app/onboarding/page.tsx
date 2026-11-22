import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui";
import { getWorkspaceContext, requireUser } from "@/lib/auth";
import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export const metadata = { title: "Set up your workspace" };

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-1 text-sm text-muted">
          A workspace holds your team&apos;s leads and pipeline. You can invite teammates next.
        </p>
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="h-56" />}>
            <Onboarding />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Onboarding() {
  const user = await requireUser();
  if (await getWorkspaceContext()) redirect("/app");
  const suggestedName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  return <CreateWorkspaceForm defaultName={suggestedName} />;
}
