import { signInAsDemo } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function DemoButton({ className, label = "Try the live demo" }: { className?: string; label?: string }) {
  return (
    <form action={signInAsDemo}>
      <SubmitButton variant="secondary" className={className} pendingText="Opening demo…">
        {label}
      </SubmitButton>
    </form>
  );
}
