create or replace function public.admin_list_users(
  p_search text default null,
  p_user_type text default 'ALL',
  p_city text default null,
  p_district text default null,
  p_service_category text default null,
  p_page integer default 1,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  with filtered as materialized (
    select
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.user_type,
      u.profile_image_url,
      u.is_verified,
      u.is_active,
      u.is_banned,
      u.created_at,
      u.updated_at,
      u.last_seen_at,
      ep.credit_balance,
      ep.verification_status,
      ep.completed_jobs_count,
      ep.service_category,
      ep.is_authorized_engineer,
      coalesce(
        location_data.locations,
        case
          when nullif(trim(u.city), '') is not null
            then jsonb_build_array(jsonb_build_object('city', trim(u.city), 'district', null))
          else '[]'::jsonb
        end
      ) as locations,
      case
        when lower(coalesce(
          u.notification_settings ->> 'pushEnabled',
          u.notification_settings ->> 'push',
          'true'
        )) in ('false', '0', 'off', 'no') then 'DISABLED'
        when coalesce(token_data.active_token_count, 0) > 0 then 'ACTIVE'
        when coalesce(token_data.token_count, 0) > 0 then 'UNINSTALLED'
        else 'PENDING'
      end as push_status
    from public.users u
    left join public.electrician_profiles ep on ep.user_id = u.id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('city', l.city, 'district', nullif(trim(l.district), ''))
        order by l.is_default desc, l.created_at asc
      ) as locations
      from public.locations l
      where l.user_id = u.id
        and l.is_active = true
        and nullif(trim(l.city), '') is not null
    ) location_data on true
    left join lateral (
      select
        count(*) as token_count,
        count(*) filter (where pt.is_active = true) as active_token_count
      from public.push_tokens pt
      where pt.user_id = u.id
    ) token_data on true
    where u.deleted_at is null
      and (
        nullif(trim(p_search), '') is null
        or u.full_name ilike '%' || trim(p_search) || '%'
        or u.email ilike '%' || trim(p_search) || '%'
        or coalesce(u.phone, '') ilike '%' || trim(p_search) || '%'
      )
      and (
        coalesce(nullif(p_user_type, ''), 'ALL') = 'ALL'
        or (p_user_type = 'ENGINEER' and coalesce(ep.is_authorized_engineer, false))
        or (p_user_type <> 'ENGINEER' and u.user_type::text = p_user_type)
      )
      and (
        nullif(trim(p_service_category), '') is null
        or ep.service_category = trim(p_service_category)
      )
      and (
        nullif(trim(p_city), '') is null
        or u.city = trim(p_city)
        or exists (
          select 1 from public.locations city_location
          where city_location.user_id = u.id
            and city_location.is_active = true
            and city_location.city = trim(p_city)
        )
      )
      and (
        nullif(trim(p_district), '') is null
        or exists (
          select 1 from public.locations district_location
          where district_location.user_id = u.id
            and district_location.is_active = true
            and district_location.district = trim(p_district)
        )
      )
  ), paged as (
    select *
    from filtered
    order by created_at desc
    limit safe_limit
    offset (safe_page - 1) * safe_limit
  )
  select jsonb_build_object(
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'fullName', p.full_name,
        'email', p.email,
        'phone', p.phone,
        'userType', p.user_type::text,
        'profileImageUrl', p.profile_image_url,
        'creditBalance', coalesce(p.credit_balance, 0),
        'isVerified', p.is_verified,
        'isActive', p.is_active,
        'isBanned', p.is_banned,
        'verificationStatus', p.verification_status::text,
        'completedJobsCount', coalesce(p.completed_jobs_count, 0),
        'serviceCategory', p.service_category,
        'isAuthorizedEngineer', coalesce(p.is_authorized_engineer, false),
        'locations', p.locations,
        'pushStatus', p.push_status,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'lastSeenAt', p.last_seen_at
      ) order by p.created_at desc)
      from paged p
    ), '[]'::jsonb),
    'totalCount', (select count(*) from filtered),
    'totalPages', greatest(1, ceil((select count(*) from filtered)::numeric / safe_limit)::integer),
    'page', safe_page
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_list_users(text, text, text, text, text, integer, integer)
  from public, anon;
grant execute on function public.admin_list_users(text, text, text, text, text, integer, integer)
  to authenticated;

