# LeadForge

A simple, multi-tenant CRM for small service businesses (agencies, clinics, contractors). Track leads on a
Kanban pipeline, log calls and notes, schedule follow-ups, capture enquiries from your website, and see your
numbers on one dashboard.

> **Showcase project by [SoftForge AI](https://softforgeai.com).** LeadForge is our own build, not a client
> engagement. We built it with AI-accelerated engineering and held it to the standards we apply to client work.
> All demo data is fictional.

**Live demo:** _add URL after deploy_ · **Walkthrough video:** _add URL_

## Features

- **Workspaces and teams.** Sign up, create a workspace, and invite teammates as Admins or Sales reps.
- **Pipeline.** Kanban board with drag-and-drop (plus a stage menu on each card for mobile and keyboard users)
  and editable stages.
- **Leads table.** Search, filter by stage, rep, source and tag, sort, paginate, and export to CSV.
- **Lead timeline.** Notes, calls and emails, with stage changes and reassignments logged automatically.
- **Follow-ups.** A follow-up on any lead; the Today page shows what's overdue and due today in your timezone.
- **Website lead form.** A shareable, embeddable form. Submissions land in your pipeline.
- **CSV import** with per-row validation and a report of skipped rows.
- **Dashboard.** Open pipeline value, won value, win rate, leads by stage and source, and a leaderboard.
- **One-click demo**, dark mode, and responsive layouts throughout.

## Production standards, and what they protect against

Apps generated with AI builders usually work in a demo. They tend to fail on the points below once real users
and real data arrive. This is how LeadForge handles each one.

| Common gap in AI-built apps | How LeadForge handles it | Where it's proven |
| --- | --- | --- |
| Tables readable by anyone with the public key | Row-level security on every table; anonymous users have no table access | `tests/db-policies.mjs`, `tests/rls.test.ts` |
| One customer can see another customer's data | Every row belongs to a workspace; composite foreign keys stop cross-workspace references | `tests/db-policies.mjs`, `tests/rls.test.ts` |
| Roles enforced only in the UI | Rep/admin/owner rules are enforced in Postgres policies and functions | `tests/db-policies.mjs`, `tests/rls.test.ts` |
| Users can edit fields they shouldn't (owner, flags) | Column-level grants: `created_by`, `is_demo`, `form_token` and `workspace_id` can't be updated by users | `tests/db-policies.mjs`, `tests/rls.test.ts` |
| Secret keys shipped to the browser | All database access runs on the server; the secret key is `server-only` and fails the build if imported client-side | `src/lib/supabase/admin.ts` |
| Public forms open to spam and abuse | Server-side validation, honeypot, and per-visitor and per-day rate limits in the database (IP hashed with a secret salt) | `submit_lead_form` in the migration |
| Search boxes that inject query filters | Search input is sanitised before reaching PostgREST filters | `src/lib/helpers.test.ts`, `e2e/smoke.spec.ts` |
| CSV exports that run formulas in Excel | Cells starting with `= + - @` are neutralised | `src/lib/csv.test.ts` |
| Totals silently wrong past 1,000 rows | Dashboard aggregates run in SQL; exports page through all rows | `lead_stats` in the migration |
| Open redirects after login | `?next=` only accepts local paths | `src/lib/helpers.test.ts` |
| Raw database errors shown to users | Only known, user-facing messages pass through; the rest are logged | `src/lib/action-result.ts` |
| Clickjacking and missing security headers | CSP, `X-Frame-Options`, HSTS and more; only the lead form can be embedded | `next.config.ts`, `e2e/smoke.spec.ts` |
| No tests, no CI | Unit, database-security and end-to-end tests; CI on every pull request | `.github/workflows/ci.yml` |
| No way to tell if production is up | `/api/health` checks the app and the database | `src/app/api/health/route.ts` |

## Tech stack

Next.js 16 (App Router, Server Actions, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres,
Auth, RLS) · Zod · Vitest · Playwright · GitHub Actions

## Getting started

1. **Create a Supabase project** at [supabase.com](https://supabase.com). Use a separate project for
   development and testing.
2. **Apply the schema.** Either paste `supabase/migrations/20261122000000_init.sql` into the Supabase SQL
   editor, or with the CLI:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Configure auth** in Supabase → Authentication → URL configuration: set the Site URL to your app URL and
   add `<your-app-url>/auth/confirm**` to the redirect URLs. The default email templates work as they are.
4. **Environment variables.** Copy `.env.example` to `.env.local` and fill it in.
5. **Install, seed and run:**
   ```bash
   npm install
   npm run seed:demo   # creates the demo workspace and demo login
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm test` | Unit tests |
| `npm run test:db` | Database policy tests: applies the migrations to PGlite (in-process Postgres) and checks the security rules as different users. No Supabase project needed. |
| `npm run test:rls` | Database security tests against the Supabase project in `.env.local` (creates and deletes throwaway users) |
| `npm run test:e2e` | Playwright end-to-end tests (desktop and mobile) against a running app with the demo seeded |
| `npm run seed:demo` | Create or reset the demo workspace |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the linked Supabase project |

## Deployment

### Netlify

`netlify.toml` pins the build command and Node version; Netlify applies its Next.js adapter automatically.

1. **Add new site → Import an existing project →** pick this repository. Keep the detected settings.
2. **Environment variables** (Site configuration → Environment variables): add every variable from
   `.env.example`, with `NEXT_PUBLIC_SITE_URL` set to the Netlify URL (for example
   `https://leadforge-crm.netlify.app`). Mark `SUPABASE_SECRET_KEY`, `IP_HASH_SALT` and `DEMO_PASSWORD` as secret.
3. **Deploy.** If you change `NEXT_PUBLIC_*` values later, redeploy, because they're baked in at build time.
4. **Supabase → Authentication → URL configuration:** set the Site URL to the Netlify URL and add
   `https://<your-site>.netlify.app/auth/confirm**` to the redirect URLs.

The `NEXT_PUBLIC_*` values are excluded from Netlify's secrets scanning because they're public by design;
the server-only secrets are still scanned.

### After deploying

Set the same environment variables on any host, with `NEXT_PUBLIC_SITE_URL` set to the production URL. Then:

- add `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY` and `TEST_SUPABASE_SECRET_KEY` repository secrets
  so CI runs the database security tests against a **test** project;
- add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DEMO_EMAIL` and `DEMO_PASSWORD` secrets and set the repository
  variable `DEMO_RESET_ENABLED=true` to reset the demo every night;
- point an uptime monitor at `/api/health`.

## Project structure

```
supabase/migrations/   Schema, RLS policies, database functions
src/proxy.ts           Session refresh and signed-out redirects
src/lib/               Auth, data access, validation, CSV, formatting (with unit tests)
src/app/(auth)/        Sign in, sign up, password reset
src/app/app/           The CRM (dashboard, pipeline, leads, today, import, settings) and its server actions
src/app/f/[token]/     Public lead-capture form
tests/                 Database security tests
e2e/                   Playwright end-to-end tests
scripts/seed-demo.mts  Demo workspace seed and reset
```
