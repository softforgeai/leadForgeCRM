import { ResetPasswordForm } from "../forms";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </>
  );
}
