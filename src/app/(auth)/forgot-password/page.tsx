import Link from "next/link";
import { ForgotPasswordForm } from "../forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent-text hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
