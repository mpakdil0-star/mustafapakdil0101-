-- Preserve the original snapshot implementation, then layer reliable activity
-- counts over it. Existing app versions refresh push_tokens on foreground;
-- newer versions also update users.last_seen_at.

alter function public.admin_statistics_snapshot(text)
  rename to admin_statistics_snapshot_v1;

revoke all on function public.admin_statistics_snapshot_v1(text)
  from public, anon, authenticated;

create or replace function public.admin_statistics_snapshot(
  p_city text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  selected_city text := nullif(trim(coalesce(p_city, '')), '');
  activity jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if selected_city = 'ALL' then
    selected_city := null;
  end if;

  result := public.admin_statistics_snapshot_v1(p_city);

  with active_users as materialized (
    select u.*
    from public.users u
    where u.deleted_at is null
      and u.is_active = true
      and u.is_banned = false
      and (
        selected_city is null
        or u.city = selected_city
        or exists (
          select 1 from public.locations l
          where l.user_id = u.id
            and l.is_active = true
            and trim(l.city) = selected_city
        )
      )
  ),
  last_activity as materialized (
    select
      u.id,
      u.user_type,
      greatest(
        u.last_seen_at,
        u.last_login_at,
        max(pt.last_seen_at)
      ) as last_activity_at
    from active_users u
    left join public.push_tokens pt on pt.user_id = u.id
    group by u.id, u.user_type, u.last_seen_at, u.last_login_at
  )
  select jsonb_build_object(
    'activeUstalar', count(*) filter (
      where user_type = 'ELECTRICIAN'::public."UserType"
        and last_activity_at >= now() - interval '24 hours'
    ),
    'activeCitizens', count(*) filter (
      where user_type = 'CITIZEN'::public."UserType"
        and last_activity_at >= now() - interval '24 hours'
    )
  ) into activity
  from last_activity;

  return jsonb_set(result, '{liveData}', activity, true);
end;
$$;

revoke all on function public.admin_statistics_snapshot(text) from public, anon;
grant execute on function public.admin_statistics_snapshot(text) to authenticated;
