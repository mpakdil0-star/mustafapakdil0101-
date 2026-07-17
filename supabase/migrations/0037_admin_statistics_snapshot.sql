-- A single, admin-only statistics snapshot. Keeping the aggregation in the
-- database prevents the mobile client from combining counts captured at
-- different moments and avoids relying on columns that do not exist.

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
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if selected_city = 'ALL' then
    selected_city := null;
  end if;

  with
  valid_users as materialized (
    select u.*
    from public.users u
    where u.deleted_at is null
  ),
  active_users as materialized (
    select u.*
    from valid_users u
    where u.is_active = true
      and u.is_banned = false
  ),
  user_regions as materialized (
    select distinct
      u.id as user_id,
      trim(l.city) as city,
      nullif(trim(l.district), '') as district
    from active_users u
    join public.locations l on l.user_id = u.id and l.is_active = true
    where nullif(trim(l.city), '') is not null

    union

    select
      u.id,
      trim(u.city),
      null::text
    from active_users u
    where nullif(trim(u.city), '') is not null
      and not exists (
        select 1 from public.locations l
        where l.user_id = u.id and l.is_active = true
          and nullif(trim(l.city), '') is not null
      )
  ),
  canonical_regions as materialized (
    select distinct on (u.id)
      u.id as user_id,
      coalesce(nullif(trim(l.city), ''), nullif(trim(u.city), '')) as city,
      nullif(trim(l.district), '') as district
    from active_users u
    left join public.locations l on l.id = (
      select chosen.id
      from public.locations chosen
      where chosen.user_id = u.id and chosen.is_active = true
      order by chosen.is_default desc, chosen.created_at asc
      limit 1
    )
    order by u.id
  ),
  scoped_users as materialized (
    select u.*
    from active_users u
    where selected_city is null
       or exists (
         select 1 from user_regions ur
         where ur.user_id = u.id and ur.city = selected_city
       )
  ),
  active_jobs as materialized (
    select
      j.*,
      nullif(trim(j.location ->> 'city'), '') as city,
      nullif(trim(j.location ->> 'district'), '') as district
    from public.job_posts j
    where j.deleted_at is null
      and j.status in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus")
      and (selected_city is null or trim(j.location ->> 'city') = selected_city)
  ),
  all_jobs as materialized (
    select j.*
    from public.job_posts j
    where j.deleted_at is null
      and (selected_city is null or trim(j.location ->> 'city') = selected_city)
  ),
  service_counts as (
    select
      coalesce(nullif(trim(ep.service_category), ''), 'Belirtilmedi') as name,
      count(*)::integer as count
    from scoped_users u
    join public.electrician_profiles ep on ep.user_id = u.id
    where u.user_type = 'ELECTRICIAN'::public."UserType"
    group by 1
  ),
  citizen_district_counts as (
    select
      coalesce(cr.district, 'Konum belirtilmedi') as name,
      count(*)::integer as count
    from scoped_users u
    left join canonical_regions cr on cr.user_id = u.id
    where u.user_type = 'CITIZEN'::public."UserType"
    group by 1
  ),
  job_district_counts as (
    select city, district, count(*)::integer as job_count
    from active_jobs
    where city is not null and district is not null
    group by city, district
  ),
  master_district_counts as (
    select ur.city, ur.district, count(distinct ur.user_id)::integer as master_count
    from user_regions ur
    join scoped_users u on u.id = ur.user_id
    join public.electrician_profiles ep on ep.user_id = u.id
    where u.user_type = 'ELECTRICIAN'::public."UserType"
      and ep.is_available = true
      and ur.city is not null and ur.district is not null
    group by ur.city, ur.district
  ),
  district_balance as (
    select
      coalesce(j.city, m.city) as city,
      coalesce(j.district, m.district) as district,
      coalesce(j.job_count, 0) as job_count,
      coalesce(m.master_count, 0) as master_count
    from job_district_counts j
    full join master_district_counts m
      on m.city = j.city and m.district = j.district
  ),
  available_cities as (
    select city from user_regions where city is not null
    union
    select nullif(trim(location ->> 'city'), '')
    from public.job_posts
    where deleted_at is null and nullif(trim(location ->> 'city'), '') is not null
  ),
  purchase_totals as (
    select
      count(*) filter (where gp.status in ('GRANTED', 'GRANTED_PENDING_CONSUME', 'CONSUMED'))::integer as successful_count,
      count(*) filter (where gp.status in ('RECEIVED', 'VERIFYING', 'PENDING', 'VERIFIED', 'FAILED_RETRYABLE'))::integer as pending_count,
      coalesce(sum(
        case when gp.status in ('GRANTED', 'GRANTED_PENDING_CONSUME', 'CONSUMED') then
          case gp.product_id
            when 'pkg_10' then 189
            when 'pkg_35' then 489
            when 'pkg_75' then 889
            when 'pkg_175' then 1489
            else 0
          end
        else 0 end
      ), 0)::numeric as list_price_revenue
    from public.google_play_purchases gp
    join scoped_users purchase_user on purchase_user.id = gp.user_id
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'selectedCity', coalesce(selected_city, 'ALL'),
    'kpis', jsonb_build_object(
      'registeredUsers', (select count(*) from valid_users),
      'totalCitizens', (select count(*) from scoped_users where user_type = 'CITIZEN'::public."UserType"),
      'totalElectricians', (select count(*) from scoped_users where user_type = 'ELECTRICIAN'::public."UserType"),
      'pendingVerifications', (
        select count(*) from scoped_users u
        join public.electrician_profiles ep on ep.user_id = u.id
        where ep.verification_status = 'PENDING'::public."VerificationStatus"
      ),
      'activeJobs', (select count(*) from active_jobs),
      'completedJobs', (select count(*) from all_jobs where status = 'COMPLETED'::public."JobStatus"),
      'successfulPurchases', (select successful_count from purchase_totals),
      'pendingPurchases', (select pending_count from purchase_totals),
      'listPriceRevenue', (select list_price_revenue from purchase_totals)
    ),
    'liveData', jsonb_build_object(
      'activeUstalar', (
        select count(*) from scoped_users
        where user_type = 'ELECTRICIAN'::public."UserType"
          and last_seen_at >= now() - interval '24 hours'
      ),
      'activeCitizens', (
        select count(*) from scoped_users
        where user_type = 'CITIZEN'::public."UserType"
          and last_seen_at >= now() - interval '24 hours'
      )
    ),
    'serviceDistribution', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count) order by count desc, name)
      from service_counts
    ), '[]'::jsonb),
    'districtDistribution', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count) order by count desc, name)
      from citizen_district_counts
    ), '[]'::jsonb),
    'heatmap', coalesce((
      select jsonb_agg(jsonb_build_object(
        'city', city,
        'district', district,
        'jobCount', job_count,
        'masterCount', master_count,
        'status', case
          when job_count = 0 or master_count >= job_count then 'GREEN'
          when master_count = 0 or master_count * 2 < job_count then 'RED'
          else 'YELLOW'
        end
      ) order by job_count desc, city, district)
      from district_balance
    ), '[]'::jsonb),
    'availableCities', coalesce((
      select jsonb_agg(city order by city) from available_cities
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_statistics_snapshot(text) from public, anon;
grant execute on function public.admin_statistics_snapshot(text) to authenticated;
