-- Expose active electrician service regions without leaking exact addresses.
-- Admins already have RLS access to the underlying locations table; the public
-- projection intentionally contains only city and district.

create or replace view public.public_electricians
with (security_barrier = true)
as
select
  u.id,
  u.full_name,
  coalesce(
    u.city,
    (
      select l.city
      from public.locations l
      where l.user_id = u.id and l.is_active = true
      order by l.is_default desc, l.created_at asc
      limit 1
    )
  ) as city,
  u.profile_image_url,
  u.is_verified,
  ep.company_name,
  ep.bio,
  ep.experience_years,
  ep.specialties,
  ep.rating_average,
  ep.total_reviews,
  ep.completed_jobs_count,
  ep.hourly_rate,
  ep.minimum_charge,
  ep.is_available,
  ep.verification_status,
  ep.service_category,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'city', l.city,
          'district', nullif(l.district, '')
        )
        order by l.is_default desc, l.city asc, l.district asc
      )
      from public.locations l
      where l.user_id = u.id and l.is_active = true
    ),
    '[]'::jsonb
  ) as locations
from public.users u
join public.electrician_profiles ep on ep.user_id = u.id
where u.user_type = 'ELECTRICIAN'::public."UserType"
  and u.is_active = true
  and u.is_banned = false
  and u.deleted_at is null;

revoke all on public.public_electricians from public;
grant select on public.public_electricians to anon, authenticated;
