-- Super-admin user directory: every account on the platform with its
-- workspaces, searchable and filterable, paged in SQL so it scales past what
-- auth.admin.listUsers can return in one go. Service role only.

create function public.admin_list_users(
  p_q text default null,
  p_workspace uuid default null,
  p_role public.member_role default null,
  p_status text default null,        -- active | inactive | never | unconfirmed | no_workspace | admin
  p_include_demo boolean default false,
  p_sort text default 'created',     -- created | last_sign_in | name | email
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  is_platform_admin boolean,
  memberships jsonb,
  total_count bigint
)
language sql stable security definer set search_path = ''
as $$
  with base as (
    select
      u.id,
      u.email::text as email,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      exists (select 1 from public.platform_admins pa where pa.user_id = u.id) as is_platform_admin,
      ms.memberships,
      ms.names,
      coalesce(ms.any_real, false) as any_real,
      coalesce(ms.any_demo, false) as any_demo,
      coalesce(
        ms.first_name,
        nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
        split_part(u.email::text, '@', 1)
      ) as name
    from auth.users u
    left join lateral (
      select
        jsonb_agg(
          jsonb_build_object(
            'workspace_id', w.id, 'workspace_name', w.name, 'role', m.role,
            'display_name', m.display_name, 'is_demo', w.is_demo, 'joined_at', m.created_at
          ) order by m.created_at
        ) as memberships,
        string_agg(m.display_name, ' ') as names,
        (array_agg(m.display_name order by m.created_at))[1] as first_name,
        bool_or(not w.is_demo) as any_real,
        bool_or(w.is_demo) as any_demo
      from public.workspace_members m
      join public.workspaces w on w.id = m.workspace_id
      where m.user_id = u.id
    ) ms on true
  ),
  filtered as (
    select b.* from base b
    where
      -- Plain substring match (no LIKE), so % and _ in the search are literal.
      (coalesce(trim(p_q), '') = ''
        or position(lower(trim(p_q)) in lower(coalesce(b.email, ''))) > 0
        or position(lower(trim(p_q)) in lower(coalesce(b.names, ''))) > 0
        or position(lower(trim(p_q)) in lower(b.name)) > 0
        or b.id::text = lower(trim(p_q)))
      and (p_workspace is null or exists (
        select 1 from public.workspace_members m
        where m.user_id = b.id and m.workspace_id = p_workspace
          and (p_role is null or m.role = p_role)))
      and (p_role is null or p_workspace is not null or exists (
        select 1 from public.workspace_members m where m.user_id = b.id and m.role = p_role))
      -- Demo-only accounts are hidden unless asked for (or filtering by a workspace).
      and (p_include_demo or p_workspace is not null or b.any_real or not b.any_demo)
      and case p_status
        when 'active' then b.last_sign_in_at > now() - interval '7 days'
        when 'inactive' then b.last_sign_in_at <= now() - interval '30 days'
        when 'never' then b.last_sign_in_at is null
        when 'unconfirmed' then b.email_confirmed_at is null
        when 'no_workspace' then b.memberships is null
        when 'admin' then b.is_platform_admin
        else true
      end
  )
  select f.id, f.email, f.name, f.created_at, f.last_sign_in_at, f.email_confirmed_at,
         f.is_platform_admin, coalesce(f.memberships, '[]'::jsonb), count(*) over ()
  from filtered f
  order by
    case when p_sort = 'name' then lower(f.name) end asc,
    case when p_sort = 'email' then lower(f.email) end asc,
    case when p_sort = 'last_sign_in' then f.last_sign_in_at end desc nulls last,
    f.created_at desc,
    f.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.admin_list_users(text, uuid, public.member_role, text, boolean, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_users(text, uuid, public.member_role, text, boolean, text, integer, integer)
  to service_role;
