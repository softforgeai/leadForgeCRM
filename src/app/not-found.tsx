import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        It may have been removed, or you may not have access to it.
      </p>
      <ButtonLink href="/app" className="mt-6">
        Go to your dashboard
      </ButtonLink>
    </main>
  );
}
