import Link from "next/link";
import { BellRing, ChartNoAxesColumn, FileInput, KanbanSquare, ShieldCheck, Users } from "lucide-react";
import { DemoButton } from "@/components/DemoButton";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonLink } from "@/components/ui";

const features = [
  {
    icon: KanbanSquare,
    title: "A pipeline you can see",
    text: "Drag leads from New to Won on a Kanban board, or work through them in a searchable table.",
  },
  {
    icon: BellRing,
    title: "Follow-ups that don't slip",
    text: "Set a follow-up on any lead. Your Today page shows what's overdue and what's due now.",
  },
  {
    icon: FileInput,
    title: "Leads straight from your website",
    text: "Embed a simple form on your site. New enquiries land in your pipeline automatically.",
  },
  {
    icon: Users,
    title: "Built for small teams",
    text: "Invite your team as admins or sales reps. Reps see only the leads assigned to them.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Know your numbers",
    text: "Pipeline value, win rate, lead sources, and a leaderboard, on one dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    text: "Every workspace is isolated in the database itself, with tests that prove it.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-8 sm:pt-20">
          <p className="mx-auto inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            For agencies, clinics, contractors and other service businesses
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Stop losing leads in spreadsheets.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted">
            LeadForge keeps every enquiry, conversation and follow-up in one place, so your team always knows who to
            call next.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" className="w-full sm:w-auto">
              Create a free workspace
            </ButtonLink>
            <DemoButton className="w-full sm:w-auto" />
          </div>
          <p className="mt-3 text-xs text-subtle">The demo opens a sample workspace with fictional data. No sign-up needed.</p>
        </section>

        <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
          <h2 id="features" className="sr-only">
            Features
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-line bg-surface p-6">
                <Icon aria-hidden className="size-5 text-accent-text" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between sm:px-8">
          <p>
            A showcase project by{" "}
            <Link href="https://softforgeai.com" className="font-medium text-fg hover:underline">
              SoftForge AI
            </Link>
            . Demo data is fictional.
          </p>
          <p>Built with Next.js, Supabase and Postgres row-level security.</p>
        </div>
      </footer>
    </div>
  );
}
