import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { AcceptInviteForm } from "./AcceptInviteForm";

export const metadata = { title: "Join a workspace" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex min-h-dvh items-start justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-10 text-2xl font-semibold tracking-tight">You&apos;ve been invited to LeadForge</h1>
        <p className="mt-1 text-sm text-muted">Confirm your name to join your team&apos;s workspace.</p>
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="h-40" />}>
            <Invite params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/invite/${token}`)}`);
  const name = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  return <AcceptInviteForm token={token} defaultName={name} email={user.email ?? ""} />;
}
