-- LeadForge initial schema
--
-- Security model (enforced in the database, not only in the UI):
--   * Every row belongs to a workspace. Nobody can read or write another
--     workspace's data, whatever the client sends.
--   * Roles: owner > admin > rep. Reps only see and edit leads assigned to them
--     and cannot reassign leads to someone else.
--   * Privileged multi-step operations (create workspace, accept invite, change
--     roles, public form submissions) go through SECURITY DEFINER functions
--     that validate their inputs, so there are no broad write policies.
--   * The activity timeline is append-only (no update/delete policies).

-- ---------------------------------------------------------------- types

create type public.member_role as enum ('owner', 'admin', 'rep');
create type public.stage_kind as enum ('open', 'won', 'lost');
create type public.lead_source as enum ('website', 'referral', 'linkedin', 'ads', 'other');
create type public.activity_type as enum (
  'created', 'note', 'call', 'email', 'stage_change', 'assigned', 'follow_up'
);

-- ---------------------------------------------------------------- tables

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  -- Unguessable token used in the public lead-capture form URL.
  form_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'rep',
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null default 'rep' check (role <> 'owner'),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
create index invitations_workspace_idx on public.invitations (workspace_id);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position integer not null,
  kind public.stage_kind not null default 'open',
  created_at timestamptz not null default now(),
  -- Lets leads reference (stage, workspace) so a lead can never point at a
  -- stage from another workspace.
  unique (id, workspace_id)
);
create index pipeline_stages_workspace_idx on public.pipeline_stages (workspace_id, position);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text check (company is null or char_length(company) <= 120),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or char_length(phone) <= 40),
  source public.lead_source not null default 'other',
  value_cents bigint not null default 0 check (value_cents between 0 and 100000000000),
  stage_id uuid not null,
  assigned_to uuid,
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (stage_id, workspace_id)
    references public.pipeline_stages (id, workspace_id) on delete restrict,
  -- The assignee must be a member of the same workspace. If they leave, the
  -- lead becomes unassigned instead of disappearing.
  foreign key (workspace_id, assigned_to)
    references public.workspace_members (workspace_id, user_id) on delete set null (assigned_to)
);
create index leads_workspace_stage_idx on public.leads (workspace_id, stage_id);
create index leads_workspace_assignee_idx on public.leads (workspace_id, assigned_to);
create index leads_workspace_created_idx on public.leads (workspace_id, created_at desc);

create table public.activities (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type public.activity_type not null,
  body text check (body is null or char_length(body) <= 5000),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activities_lead_idx on public.activities (lead_id, created_at desc);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  assigned_to uuid not null,
  task text not null check (char_length(task) between 1 and 200),
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, assigned_to)
    references public.workspace_members (workspace_id, user_id) on delete cascade
);
create index follow_ups_open_idx on public.follow_ups (workspace_id, assigned_to, due_at)
  where completed_at is null;
create index follow_ups_lead_idx on public.follow_ups (lead_id);

-- Log of public form submissions, used only for rate limiting.
create table public.form_submissions (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index form_submissions_rate_idx on public.form_submissions (workspace_id, ip_hash, created_at desc);

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so policies can check membership without recursing into
-- workspace_members' own policies. search_path is pinned to avoid hijacking.

create function public.member_role_in(ws uuid)
returns public.member_role
language sql stable security definer set search_path = ''
as $$
  select role from public.workspace_members
  where workspace_id = ws and user_id = (select auth.uid());
$$;

create function public.is_member(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = (select auth.uid())
  );
$$;

create function public.is_manager(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.member_role_in(ws) in ('owner', 'admin'), false);
$$;

-- ---------------------------------------------------------------- triggers

create function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- Writes the automatic timeline entries. Runs as definer so it can log events
-- for public form submissions, which have no signed-in actor.
create function public.log_lead_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  from_name text;
  to_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (workspace_id, lead_id, actor_id, type, meta)
    values (new.workspace_id, new.id, auth.uid(), 'created', jsonb_build_object('source', new.source));
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    select name into from_name from public.pipeline_stages where id = old.stage_id;
    select name into to_name from public.pipeline_stages where id = new.stage_id;
    insert into public.activities (workspace_id, lead_id, actor_id, type, meta)
    values (new.workspace_id, new.id, auth.uid(), 'stage_change',
            jsonb_build_object('from', from_name, 'to', to_name));
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.activities (workspace_id, lead_id, actor_id, type, meta)
    values (new.workspace_id, new.id, auth.uid(), 'assigned',
            jsonb_build_object('to', (
              select display_name from public.workspace_members
              where workspace_id = new.workspace_id and user_id = new.assigned_to
            )));
  end if;
  return new;
end;
$$;

create trigger leads_activity_insert after insert on public.leads
  for each row execute function public.log_lead_activity();
create trigger leads_activity_update after update of stage_id, assigned_to on public.leads
  for each row execute function public.log_lead_activity();

-- Leads and follow-ups can't be moved between workspaces after creation.
create function public.prevent_workspace_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.workspace_id <> old.workspace_id then
    raise exception 'workspace_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger leads_lock_workspace before update on public.leads
  for each row execute function public.prevent_workspace_change();
create trigger follow_ups_lock_workspace before update on public.follow_ups
  for each row execute function public.prevent_workspace_change();

-- ---------------------------------------------------------------- RLS

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.follow_ups enable row level security;
alter table public.form_submissions enable row level security; -- no policies: server only

-- workspaces
create policy "members read workspace" on public.workspaces
  for select to authenticated using (public.is_member(id));
create policy "managers update workspace" on public.workspaces
  for update to authenticated using (public.is_manager(id)) with check (public.is_manager(id));

-- workspace_members (writes go through functions below)
create policy "members read members" on public.workspace_members
  for select to authenticated using (public.is_member(workspace_id));

-- invitations
create policy "managers read invitations" on public.invitations
  for select to authenticated using (public.is_manager(workspace_id));
create policy "managers create invitations" on public.invitations
  for insert to authenticated
  with check (public.is_manager(workspace_id) and invited_by = (select auth.uid()));
create policy "managers delete invitations" on public.invitations
  for delete to authenticated using (public.is_manager(workspace_id));

-- pipeline_stages
create policy "members read stages" on public.pipeline_stages
  for select to authenticated using (public.is_member(workspace_id));
create policy "managers insert stages" on public.pipeline_stages
  for insert to authenticated with check (public.is_manager(workspace_id));
create policy "managers update stages" on public.pipeline_stages
  for update to authenticated
  using (public.is_manager(workspace_id)) with check (public.is_manager(workspace_id));
create policy "managers delete stages" on public.pipeline_stages
  for delete to authenticated using (public.is_manager(workspace_id));

-- leads: managers see everything, reps only what's assigned to them
create policy "read visible leads" on public.leads
  for select to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())));
create policy "create leads" on public.leads
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())))
  );
create policy "update visible leads" on public.leads
  for update to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())))
  with check (public.is_manager(workspace_id)
              or (public.is_member(workspace_id) and assigned_to = (select auth.uid())));
create policy "managers delete leads" on public.leads
  for delete to authenticated using (public.is_manager(workspace_id));

-- activities: visible if the lead is visible; append-only
create policy "read activities of visible leads" on public.activities
  for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "log manual activities" on public.activities
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and type in ('note', 'call', 'email')
    and exists (select 1 from public.leads l where l.id = lead_id and l.workspace_id = activities.workspace_id)
  );

-- follow_ups
create policy "read follow-ups" on public.follow_ups
  for select to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())));
create policy "create follow-ups" on public.follow_ups
  for insert to authenticated
  with check (
    (public.is_manager(workspace_id) or assigned_to = (select auth.uid()))
    and exists (select 1 from public.leads l where l.id = lead_id and l.workspace_id = follow_ups.workspace_id)
  );
create policy "update follow-ups" on public.follow_ups
  for update to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())))
  with check (
    (public.is_manager(workspace_id)
     or (public.is_member(workspace_id) and assigned_to = (select auth.uid())))
    and exists (select 1 from public.leads l where l.id = lead_id and l.workspace_id = follow_ups.workspace_id)
  );
create policy "delete follow-ups" on public.follow_ups
  for delete to authenticated
  using (public.is_manager(workspace_id)
         or (public.is_member(workspace_id) and assigned_to = (select auth.uid())));

-- ---------------------------------------------------------------- functions

-- Creates a workspace, makes the caller its owner, and adds default stages.
create function public.create_workspace(p_name text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  user_email text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception 'invalid workspace name'; end if;
  if char_length(trim(p_display_name)) not between 1 and 80 then raise exception 'invalid display name'; end if;
  if (select count(*) from public.workspaces where created_by = uid) >= 5 then
    raise exception 'workspace limit reached';
  end if;

  select email into user_email from auth.users where id = uid;

  insert into public.workspaces (name, created_by) values (trim(p_name), uid) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role, display_name, email)
    values (ws, uid, 'owner', trim(p_display_name), user_email);
  insert into public.pipeline_stages (workspace_id, name, position, kind) values
    (ws, 'New', 0, 'open'),
    (ws, 'Contacted', 1, 'open'),
    (ws, 'Qualified', 2, 'open'),
    (ws, 'Proposal Sent', 3, 'open'),
    (ws, 'Won', 4, 'won'),
    (ws, 'Lost', 5, 'lost');
  return ws;
end;
$$;

-- Accepts an invitation. The signed-in user's email must match the invite, so
-- a forwarded or leaked link can't be used by someone else.
create function public.accept_invitation(p_token text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invitations;
  user_email text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_display_name)) not between 1 and 80 then raise exception 'invalid display name'; end if;

  select * into inv from public.invitations
    where token = p_token and accepted_at is null and expires_at > now()
    for update;
  if not found then raise exception 'invitation not found or expired'; end if;

  select email into user_email from auth.users where id = uid;
  if lower(user_email) <> lower(inv.email) then
    raise exception 'this invitation was sent to a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, display_name, email)
    values (inv.workspace_id, uid, inv.role, trim(p_display_name), user_email)
    on conflict (workspace_id, user_id) do nothing;
  update public.invitations set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end;
$$;

-- Owners and admins can change roles of non-owners. Nobody can grant 'owner'.
create function public.set_member_role(p_workspace uuid, p_user uuid, p_role public.member_role)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_role public.member_role;
begin
  if not public.is_manager(p_workspace) then raise exception 'not allowed'; end if;
  if p_role = 'owner' then raise exception 'ownership cannot be granted here'; end if;
  if p_user = auth.uid() then raise exception 'you cannot change your own role'; end if;
  select role into target_role from public.workspace_members
    where workspace_id = p_workspace and user_id = p_user;
  if target_role is null then raise exception 'member not found'; end if;
  if target_role = 'owner' then raise exception 'the owner''s role cannot be changed'; end if;
  update public.workspace_members set role = p_role
    where workspace_id = p_workspace and user_id = p_user;
end;
$$;

create function public.remove_member(p_workspace uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_role public.member_role;
begin
  if not public.is_manager(p_workspace) then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'you cannot remove yourself'; end if;
  select role into target_role from public.workspace_members
    where workspace_id = p_workspace and user_id = p_user;
  if target_role is null then raise exception 'member not found'; end if;
  if target_role = 'owner' then raise exception 'the owner cannot be removed'; end if;
  delete from public.workspace_members where workspace_id = p_workspace and user_id = p_user;
end;
$$;

-- Deals won per member. Aggregates only, so reps can see the leaderboard
-- without seeing other reps' leads.
create function public.workspace_leaderboard(p_workspace uuid)
returns table (user_id uuid, display_name text, won_count bigint, won_value_cents bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_member(p_workspace) then raise exception 'not allowed'; end if;
  return query
    select m.user_id, m.display_name,
           count(l.id) as won_count,
           coalesce(sum(l.value_cents), 0)::bigint as won_value_cents
    from public.workspace_members m
    left join public.leads l
      on l.assigned_to = m.user_id and l.workspace_id = m.workspace_id
      and l.stage_id in (select s.id from public.pipeline_stages s
                         where s.workspace_id = p_workspace and s.kind = 'won')
    where m.workspace_id = p_workspace
    group by m.user_id, m.display_name
    -- Positional ORDER BY: the output names would clash with the function's OUT columns.
    order by 4 desc, 3 desc;
end;
$$;

-- Dashboard aggregates, computed in the database so they stay correct past
-- the API's 1,000-row response limit. SECURITY INVOKER: RLS applies, so reps
-- get stats for their own leads only.
create function public.lead_stats(p_workspace uuid)
returns table (stage_id uuid, source public.lead_source, lead_count bigint, value_cents bigint, new_this_month bigint)
language sql stable security invoker set search_path = ''
as $$
  select l.stage_id, l.source, count(*), coalesce(sum(l.value_cents), 0)::bigint,
         count(*) filter (where l.created_at >= date_trunc('month', now()))
  from public.leads l
  where l.workspace_id = p_workspace
  group by l.stage_id, l.source;
$$;

-- Issues a new public form URL (the old one stops working).
create function public.regenerate_form_token(p_workspace uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  new_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_manager(p_workspace) then raise exception 'not allowed'; end if;
  update public.workspaces set form_token = new_token where id = p_workspace;
  return new_token;
end;
$$;

-- Public lead-capture form. Only the server (service role) may call this; it
-- passes a hashed client IP so the database can rate limit per visitor.
create function public.submit_lead_form(
  p_token text, p_name text, p_email text, p_company text, p_phone text,
  p_message text, p_ip_hash text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  ws uuid;
  first_stage uuid;
begin
  select id into ws from public.workspaces where form_token = p_token;
  if ws is null then raise exception 'form not found'; end if;

  if (select count(*) from public.form_submissions
      where workspace_id = ws and ip_hash = p_ip_hash
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.form_submissions
      where workspace_id = ws and created_at > now() - interval '1 day') >= 500 then
    raise exception 'rate_limited';
  end if;

  select id into first_stage from public.pipeline_stages
    where workspace_id = ws and kind = 'open' order by position limit 1;
  if first_stage is null then raise exception 'workspace has no open stage'; end if;

  insert into public.form_submissions (workspace_id, ip_hash) values (ws, p_ip_hash);
  insert into public.leads (workspace_id, name, email, company, phone, source, stage_id, notes)
    values (ws, p_name, nullif(p_email, ''), nullif(p_company, ''), nullif(p_phone, ''),
            'website', first_stage, nullif(p_message, ''));
end;
$$;

-- ---------------------------------------------------------------- grants
-- Supabase grants EXECUTE on public functions to anon/authenticated by
-- default. Lock everything down, then open only what each role needs.

revoke execute on all functions in schema public from public, anon, authenticated;

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
grant execute on function public.submit_lead_form(text, text, text, text, text, text, text) to service_role;

-- Anonymous visitors get no table access at all.
revoke all on all tables in schema public from anon;

-- Column-level UPDATE grants: policies decide WHICH rows a user can change,
-- these decide WHICH columns. Fields like created_by, is_demo, workspace_id
-- and form_token can't be edited directly by any signed-in user.
revoke update on all tables in schema public from authenticated;
grant update (name, logo_url) on public.workspaces to authenticated;
grant update (name, position) on public.pipeline_stages to authenticated;
grant update (name, company, email, phone, source, value_cents, stage_id, assigned_to, tags, notes)
  on public.leads to authenticated;
grant update (task, due_at, completed_at, assigned_to) on public.follow_ups to authenticated;
