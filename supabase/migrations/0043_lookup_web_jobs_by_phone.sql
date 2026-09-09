-- Drop previous definition if return type signature differed
drop function if exists public.lookup_web_jobs_by_phone(text);

create or replace function public.lookup_web_jobs_by_phone(p_phone text)
returns table (
  job_id text,
  title text,
  category text,
  service_category text,
  status text,
  city text,
  district text,
  bid_count integer,
  created_at timestamp
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  norm_phone text;
begin
  norm_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if norm_phone ~ '^90[5][0-9]{9}$' then
    norm_phone := substring(norm_phone from 3);
  end if;
  if norm_phone !~ '^0?5[0-9]{9}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if left(norm_phone, 1) <> '0' then
    norm_phone := '0' || norm_phone;
  end if;

  return query
  select
    j.id as job_id,
    j.title,
    j.category,
    coalesce(j.service_category, 'elektrik') as service_category,
    j.status::text,
    coalesce(j.location ->> 'city', '') as city,
    coalesce(j.location ->> 'district', '') as district,
    (select count(*)::integer from public.bids b where b.job_post_id = j.id) as bid_count,
    j.created_at
  from public.web_job_contacts c
  join public.job_posts j on j.id = c.job_id
  where c.phone = norm_phone
    and j.deleted_at is null
  order by j.created_at desc
  limit 10;
end;
$$;

revoke all on function public.lookup_web_jobs_by_phone(text) from public;
grant execute on function public.lookup_web_jobs_by_phone(text) to anon, authenticated;
