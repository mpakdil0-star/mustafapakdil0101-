-- Notify matching electricians whenever a citizen publishes a new job.
-- The notification row and its push outbox row are created in the same
-- transaction as the job so the push worker can deliver it reliably.

create unique index if not exists notifications_new_job_recipient_idx
on public.notifications (user_id, related_id)
where type = 'new_job' and related_id is not null;

create or replace function public.notify_matching_electricians_for_new_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_city text := nullif(btrim(new.location ->> 'city'), '');
  job_district text := nullif(btrim(new.location ->> 'district'), '');
  job_service_category text := coalesce(nullif(btrim(new.service_category), ''), 'elektrik');
begin
  if new.deleted_at is not null or new.status::text not in ('OPEN', 'BIDDING') then
    return new;
  end if;

  -- A location is required to avoid notifying unrelated electricians.
  if job_city is null then
    return new;
  end if;

  with matching_electricians as (
    select distinct u.id as user_id
    from public.users u
    join public.electrician_profiles ep on ep.user_id = u.id
    where u.user_type::text = 'ELECTRICIAN'
      and u.id <> new.citizen_id
      and u.is_active = true
      and u.is_banned = false
      and u.deleted_at is null
      and ep.is_available = true
      and lower(btrim(ep.service_category)) = lower(job_service_category)
      and (
        exists (
          select 1
          from public.locations l
          where l.user_id = u.id
            and l.is_active = true
            and lower(btrim(l.city)) = lower(job_city)
            and (
              job_district is null
              or nullif(btrim(l.district), '') is null
              or lower(btrim(l.district)) = lower(job_district)
            )
        )
        or (
          not exists (
            select 1
            from public.locations l_any
            where l_any.user_id = u.id
              and l_any.is_active = true
          )
          and lower(btrim(coalesce(u.city, ''))) = lower(job_city)
        )
      )
  ), inserted_notifications as (
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id,
      action_url
    )
    select
      match.user_id,
      'new_job',
      U&'Yeni \0130\015F \0130lan\0131',
      format(U&'%s i\00E7in yeni bir ilan yay\0131nland\0131.', new.title),
      'JOB',
      new.id,
      '/jobs/' || new.id
    from matching_electricians match
    on conflict (user_id, related_id)
      where type = 'new_job' and related_id is not null
      do nothing
    returning id, user_id
  )
  insert into public.notification_outbox (
    notification_id,
    user_id,
    event_type,
    payload
  )
  select
    notice.id,
    notice.user_id,
    'new_job',
    jsonb_build_object(
      'type', 'new_job',
      'jobId', new.id,
      'serviceCategory', job_service_category,
      'city', job_city,
      'district', job_district
    )
  from inserted_notifications notice;

  return new;
end;
$$;

revoke all on function public.notify_matching_electricians_for_new_job()
from public, anon, authenticated;

drop trigger if exists notify_matching_electricians_for_new_job
on public.job_posts;

create trigger notify_matching_electricians_for_new_job
after insert on public.job_posts
for each row
execute function public.notify_matching_electricians_for_new_job();
