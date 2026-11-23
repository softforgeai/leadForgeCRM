import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, PageTitle } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { NewTicketForm } from "../SupportForms";

export const metadata = { title: "New support request" };

export default async function NewTicketPage({ searchParams }: PageProps<"/app/support/new">) {
  await requireWorkspace();
  const { from } = await searchParams;
  // Only accept a local app path as the "where did it happen" hint.
  const defaultPage = typeof from === "string" && from.startsWith("/app") ? from.slice(0, 200) : undefined;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/app/support" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft aria-hidden className="size-4" /> Help & support
      </Link>
      <PageTitle title="New support request" description="Tell us what's going on. You'll get our replies here." />
      <Card className="p-5 sm:p-6">
        <NewTicketForm defaultPage={defaultPage} />
      </Card>
    </div>
  );
}
