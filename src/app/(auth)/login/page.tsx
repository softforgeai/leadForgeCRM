import Link from "next/link";
import { Suspense } from "react";
import { DemoButton } from "@/components/DemoButton";
import { Skeleton } from "@/components/ui";
import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your LeadForge workspace.</p>
      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <DemoButton className="w-full" label="Explore the demo workspace" />
      <p className="mt-8 text-center text-sm text-muted">
        New to LeadForge?{" "}
        <Link href="/signup" className="font-medium text-accent-text hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
