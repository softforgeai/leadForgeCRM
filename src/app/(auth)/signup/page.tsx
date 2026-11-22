import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { SignUpForm } from "../forms";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Set up a workspace for your team in under a minute.</p>
      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-72" />}>
          <SignUpForm />
        </Suspense>
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-text hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
