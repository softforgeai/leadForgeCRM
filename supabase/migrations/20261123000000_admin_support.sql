-- Platform administration and customer support
--
--   * platform_admins: SoftForge staff who can open the super-admin panel.
--     Nobody can add themselves: rows are inserted by hand in the SQL editor.
--   * support_tickets / support_messages: each workspace can report issues.
--     Members create tickets and reply through SECURITY DEFINER functions, so
--     they can never set a ticket's status, mark a message as staff, or read
--     staff-only internal notes. Staff work through the server (service role)
--     after the app has checked they are a platform admin.
--   * impersonation_sessions / admin_audit_log: every "log in as" and every
--     staff action is recorded with who did it, to whom, and why.
--
-- None of the admin tables have RLS policies, so signed-in users can't read
-- or write them at all. Only the server (service role) can.

-- ---------------------------------------------------------------- types

create type public.ticket_status as enum ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_category as enum ('bug', 'question', 'billing', 'feature_request', 'account', 'other');

-- ---------------------------------------------------------------- tables

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  -- Short, human-friendly reference shown as "#1001".
  number bigint generated always as identity (start with 1001) unique,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null check (char_length(created_by_name) between 1 and 80),
  created_by_email text not null,
  subject text not null check (char_length(subject) between 3 and 150),
  category public.ticket_category not null default 'question',
  priority public.ticket_priority not null default 'normal',
  status public.ticket_status not null default 'open',
  -- The page the customer was on, to help reproduce the issue.
  page_url text check (page_url is null or char_length(page_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- Who spoke last, so the support queue can show tickets awaiting a reply.
  last_message_by_staff boolean not null default false,
  resolved_at timestamptz
);
create index support_tickets_workspace_idx on public.support_tickets (workspace_id, last_message_at desc);
create index support_tickets_queue_idx on public.support_tickets (status, last_message_at desc);

create table public.support_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 80),
  is_staff boolean not null default false,
  -- Staff-only notes. Never visible to the customer (see policy below).
  is_internal boolean not null default false check (not is_internal or is_staff),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create table public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete set null,
  reason text not null check (char_length(reason) between 5 and 300),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  check (expires_at > started_at)
);
create index impersonation_sessions_admin_idx on public.impersonation_sessions (admin_id, started_at desc);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null check (char_length(action) between 1 and 60),
  workspace_id uuid references public.workspaces (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  ticket_id uuid references public.support_tickets (id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_workspace_idx on public.admin_audit_log (workspace_id, created_at desc);

create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();
create trigger support_tickets_lock_workspace before update on public.support_tickets
  for each row execute function public.prevent_workspace_change();

-- Keeps ticket metadata in step with the conversation, whoever writes the
-- message (customer function or staff via the service role).
create function public.on_support_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_internal then
    update public.support_tickets set updated_at = now() where id = new.ticket_id;
  elsif new.is_staff then
    update public.support_tickets
      set last_message_at = new.created_at, last_message_by_staff = true
      where id = new.ticket_id;
  else
    -- A customer reply reopens a ticket that was waiting on them or resolved.
    update public.support_tickets
      set last_message_at = new.created_at,
          last_message_by_staff = false,
          status = case when status in ('waiting_on_customer', 'resolved', 'closed') then 'open'::public.ticket_status
                        else status end,
          resolved_at = case when status in ('waiting_on_customer', 'resolved', 'closed') then null
                             else resolved_at end
      where id = new.ticket_id;
  end if;
  return new;
end;
$$;

create trigger support_messages_after_insert after insert on public.support_messages
  for each row execute function public.on_support_message();

-- ---------------------------------------------------------------- RLS

alter table public.platform_admins enable row level security;        -- no policies: server only
alter table public.impersonation_sessions enable row level security; -- no policies: server only
alter table public.admin_audit_log enable row level security;        -- no policies: server only
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Members see the tickets they opened; owners and admins see all of their
-- workspace's tickets.
create policy "read own or managed tickets" on public.support_tickets
  for select to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and created_by = (select auth.uid())));

-- Messages follow their ticket, minus staff-only internal notes.
create policy "read public messages of visible tickets" on public.support_messages
  for select to authenticated
  using (not is_internal and exists (select 1 from public.support_tickets t where t.id = ticket_id));

-- ---------------------------------------------------------------- functions

-- Opens a ticket with its first message. Rate limited per workspace so a
-- compromised or shared (demo) account can't flood the support queue.
create function public.create_support_ticket(
  p_workspace uuid, p_subject text, p_category public.ticket_category,
  p_priority public.ticket_priority, p_body text, p_page_url text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  member public.workspace_members;
  ticket uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into member from public.workspace_members where workspace_id = p_workspace and user_id = uid;
  if not found then raise exception 'not allowed'; end if;
  if char_length(trim(p_subject)) not between 3 and 150 then raise exception 'invalid subject'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'invalid message'; end if;
  if (select count(*) from public.support_tickets
      where workspace_id = p_workspace and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many tickets today';
  end if;

  insert into public.support_tickets
    (workspace_id, created_by, created_by_name, created_by_email, subject, category, priority, page_url)
  values
    (p_workspace, uid, member.display_name, member.email, trim(p_subject), p_category, p_priority,
     nullif(left(trim(coalesce(p_page_url, '')), 500), ''))
  returning id into ticket;

  insert into public.support_messages (ticket_id, author_id, author_name, body)
    values (ticket, uid, member.display_name, trim(p_body));
  return ticket;
end;
$$;

-- Customer reply. Anyone who can see the ticket (its author, or a workspace
-- manager) can reply.
create function public.reply_support_ticket(p_ticket uuid, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets;
  member_name text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_body)) not between 1 and 5000 then raise exception 'invalid message'; end if;
  select * into t from public.support_tickets where id = p_ticket;
  if not found then raise exception 'ticket not found'; end if;
  if not (public.is_manager(t.workspace_id) or (public.is_member(t.workspace_id) and t.created_by = uid)) then
    raise exception 'ticket not found';
  end if;
  if (select count(*) from public.support_messages
      where ticket_id = p_ticket and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many messages, try again later';
  end if;
  select display_name into member_name from public.workspace_members
    where workspace_id = t.workspace_id and user_id = uid;
  insert into public.support_messages (ticket_id, author_id, author_name, body)
    values (p_ticket, uid, member_name, trim(p_body));
end;
$$;

-- Customer marks their own issue as solved.
create function public.resolve_support_ticket(p_ticket uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.support_tickets;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into t from public.support_tickets where id = p_ticket;
  if not found or not (public.is_manager(t.workspace_id)
                       or (public.is_member(t.workspace_id) and t.created_by = uid)) then
    raise exception 'ticket not found';
  end if;
  update public.support_tickets set status = 'resolved', resolved_at = now()
    where id = p_ticket and status not in ('resolved', 'closed');
end;
$$;

-- ----------------------------------------------- admin analytics (server only)

-- One row per workspace with the numbers the organisations list needs.
create function public.admin_workspace_overview()
returns table (
  id uuid, name text, is_demo boolean, created_at timestamptz,
  owner_id uuid, owner_name text, owner_email text,
  member_count bigint, lead_count bigint, leads_30d bigint,
  open_value_cents bigint, won_value_cents bigint,
  last_activity_at timestamptz, open_tickets bigint
)
language sql stable security definer set search_path = ''
as $$
  select w.id, w.name, w.is_demo, w.created_at,
         o.user_id, o.display_name, o.email,
         (select count(*) from public.workspace_members m where m.workspace_id = w.id),
         coalesce(ls.lead_count, 0), coalesce(ls.leads_30d, 0),
         coalesce(ls.open_value, 0)::bigint, coalesce(ls.won_value, 0)::bigint,
         (select max(a.created_at) from public.activities a where a.workspace_id = w.id),
         (select count(*) from public.support_tickets t
           where t.workspace_id = w.id and t.status not in ('resolved', 'closed'))
  from public.workspaces w
  left join lateral (
    select m.user_id, m.display_name, m.email from public.workspace_members m
    where m.workspace_id = w.id and m.role = 'owner' order by m.created_at limit 1
  ) o on true
  left join lateral (
    select count(*) as lead_count,
           count(*) filter (where l.created_at > now() - interval '30 days') as leads_30d,
           sum(l.value_cents) filter (where s.kind = 'open') as open_value,
           sum(l.value_cents) filter (where s.kind = 'won') as won_value
    from public.leads l join public.pipeline_stages s on s.id = l.stage_id
    where l.workspace_id = w.id
  ) ls on true;
$$;

-- Platform-wide totals for the overview page.
create function public.admin_platform_stats()
returns table (
  workspaces bigint, workspaces_30d bigint, users bigint, users_30d bigint,
  active_users_7d bigint, leads bigint, leads_30d bigint,
  active_workspaces_7d bigint, open_tickets bigint, urgent_tickets bigint,
  awaiting_reply bigint
)
language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from public.workspaces where not is_demo),
    (select count(*) from public.workspaces where not is_demo and created_at > now() - interval '30 days'),
    (select count(*) from auth.users),
    (select count(*) from auth.users where created_at > now() - interval '30 days'),
    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    (select count(*) from public.leads l join public.workspaces w on w.id = l.workspace_id where not w.is_demo),
    (select count(*) from public.leads l join public.workspaces w on w.id = l.workspace_id
      where not w.is_demo and l.created_at > now() - interval '30 days'),
    (select count(distinct a.workspace_id) from public.activities a join public.workspaces w on w.id = a.workspace_id
      where not w.is_demo and a.created_at > now() - interval '7 days'),
    (select count(*) from public.support_tickets where status not in ('resolved', 'closed')),
    (select count(*) from public.support_tickets where status not in ('resolved', 'closed') and priority = 'urgent'),
    (select count(*) from public.support_tickets
      where status in ('open', 'in_progress') and not last_message_by_staff);
$$;

-- New workspaces and users per week for the last p_weeks weeks (demo excluded).
create function public.admin_signups_by_week(p_weeks integer default 12)
returns table (week_start date, workspaces bigint, users bigint)
language sql stable security definer set search_path = ''
as $$
  select wk::date,
         (select count(*) from public.workspaces w
           where not w.is_demo and w.created_at >= wk and w.created_at < wk + interval '1 week'),
         (select count(*) from auth.users u
           where u.created_at >= wk and u.created_at < wk + interval '1 week')
  from generate_series(
    date_trunc('week', now()) - make_interval(weeks => least(greatest(p_weeks, 1), 52) - 1),
    date_trunc('week', now()),
    interval '1 week'
  ) as wk
  order by 1;
$$;

-- Last sign-in for a set of users (auth.users isn't exposed through the API).
create function public.admin_user_activity(p_users uuid[])
returns table (user_id uuid, last_sign_in_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.last_sign_in_at, u.created_at from auth.users u where u.id = any (p_users);
$$;

-- ---------------------------------------------------------------- grants

revoke execute on all functions in schema public from public, anon, authenticated;

-- Re-grant what the first migration opened (the revoke above is schema-wide).
grant execute on function public.member_role_in(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_manager(uuid) to authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.accept_invitation(text, text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.workspace_leaderboard(uuid) to authenticated;
grant execute on function public.regenerate_form_token(uuid) to authenticated;
grant execute on function public.lead_stats(uuid) to authenticated;

grant execute on function public.create_support_ticket(uuid, text, public.ticket_category, public.ticket_priority, text, text) to authenticated;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;
grant execute on function public.resolve_support_ticket(uuid) to authenticated;

grant execute on function public.admin_workspace_overview() to service_role;
grant execute on function public.admin_platform_stats() to service_role;
grant execute on function public.admin_signups_by_week(integer) to service_role;
grant execute on function public.admin_user_activity(uuid[]) to service_role;

-- Signed-in users may only read support data (filtered by the policies
-- above); every write goes through the functions. Admin tables: no access.
revoke all on public.support_tickets, public.support_messages from anon, authenticated;
grant select on public.support_tickets, public.support_messages to authenticated;
revoke all on public.platform_admins, public.impersonation_sessions, public.admin_audit_log from anon, authenticated;
