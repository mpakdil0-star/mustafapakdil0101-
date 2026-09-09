-- 0044_web_cross_device_authorization.sql
-- Enables web job creators to manage and accept bids on their jobs across multiple devices
-- (PC, phone, tablet) and after phone number lookups without requiring a permanent account.

create table if not exists public.web_job_authorized_sessions (
  job_id text not null references public.job_posts(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

create index if not exists web_job_auth_sessions_user_idx
on public.web_job_authorized_sessions(user_id);

alter table public.web_job_authorized_sessions enable row level security;
revoke all on public.web_job_authorized_sessions from public, anon;
grant select on public.web_job_authorized_sessions to authenticated;

drop policy if exists web_job_auth_sessions_select on public.web_job_authorized_sessions;
create policy web_job_auth_sessions_select on public.web_job_authorized_sessions
for select to authenticated
using (user_id = auth.uid()::text);

-- Seed existing contacts into authorized sessions
insert into public.web_job_authorized_sessions (job_id, user_id)
select job_id, requester_id
from public.web_job_contacts
on conflict (job_id, user_id) do nothing;

-- 1. Explicit phone verification & claim RPC
create or replace function public.claim_web_job_by_phone(p_job_id text, p_phone text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  norm_phone text;
  matched_contact public.web_job_contacts%rowtype;
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;

  norm_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if norm_phone ~ '^90[5][0-9]{9}$' then norm_phone := substring(norm_phone from 3); end if;
  if norm_phone !~ '^0?5[0-9]{9}$' then raise exception 'INVALID_PHONE'; end if;
  if left(norm_phone, 1) <> '0' then norm_phone := '0' || norm_phone; end if;

  select * into matched_contact from public.web_job_contacts
  where job_id = p_job_id and phone = norm_phone;

  if not found then
    raise exception 'PHONE_MISMATCH';
  end if;

  insert into public.web_job_authorized_sessions (job_id, user_id)
  values (p_job_id, actor_id)
  on conflict (job_id, user_id) do nothing;

  update public.job_posts
  set citizen_id = actor_id
  where id = p_job_id;

  return true;
end;
$$;

revoke all on function public.claim_web_job_by_phone(text, text) from public;
grant execute on function public.claim_web_job_by_phone(text, text) to authenticated;

-- 2. Enhanced lookup_web_jobs_by_phone: binds caller session to found jobs
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
  actor_id text := auth.uid()::text;
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

  -- If caller is authenticated (anonymous or user), authorize current device for matching jobs
  if actor_id is not null then
    insert into public.web_job_authorized_sessions (job_id, user_id)
    select j.id, actor_id
    from public.web_job_contacts c
    join public.job_posts j on j.id = c.job_id
    where c.phone = norm_phone and j.deleted_at is null
    on conflict (job_id, user_id) do nothing;

    update public.job_posts j
    set citizen_id = actor_id
    from public.web_job_contacts c
    where c.job_id = j.id and c.phone = norm_phone and j.deleted_at is null;
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

-- 3. Enhanced accept_bid: allows authorized sessions & web contacts
create or replace function public.accept_bid(bid_id text)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target_bid public.bids;
  target_job public.job_posts;
  created_notification public.notifications;
  is_owner boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_bid from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  select * into target_job from public.job_posts where id = target_bid.job_post_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;

  is_owner := (
    target_job.citizen_id = actor_id
    or exists (
      select 1 from public.web_job_authorized_sessions
      where job_id = target_job.id and user_id = actor_id
    )
    or exists (
      select 1 from public.web_job_contacts
      where job_id = target_job.id and requester_id = actor_id
    )
  );

  if not is_owner then
    raise exception 'JOB_OWNER_REQUIRED';
  end if;

  if target_bid.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  if target_job.status not in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus") then raise exception 'JOB_NOT_OPEN'; end if;

  with rejected as (
    update public.bids
    set status = 'REJECTED', rejected_at = now()
    where job_post_id = target_bid.job_post_id
      and id <> bid_id
      and status = 'PENDING'
    returning id, electrician_id, job_post_id
  ), notices as (
    insert into public.notifications (user_id, type, title, message, related_type, related_id, action_url)
    select electrician_id, 'bid_rejected', 'Teklif Sonuçlandı', 'İlan sahibi başka bir teklifi kabul etti.', 'JOB', job_post_id, '/jobs/' || job_post_id
    from rejected
    returning id, user_id, related_id
  )
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  select id, user_id, 'bid_rejected', jsonb_build_object('type','bid_rejected','jobId',related_id)
  from notices;

  update public.bids set status = 'ACCEPTED', accepted_at = now()
  where id = bid_id returning * into target_bid;

  update public.job_posts
  set status = 'IN_PROGRESS',
      assigned_electrician_id = target_bid.electrician_id,
      accepted_bid_id = target_bid.id,
      citizen_id = actor_id
  where id = target_bid.job_post_id;

  insert into public.notifications (user_id, type, title, message, related_type, related_id, action_url)
  values (target_bid.electrician_id, 'bid_accepted', 'Teklifiniz Kabul Edildi', 'Teklifiniz ilan sahibi tarafından kabul edildi.', 'JOB', target_bid.job_post_id, '/jobs/' || target_bid.job_post_id)
  returning * into created_notification;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (created_notification.id, target_bid.electrician_id, 'bid_accepted', jsonb_build_object('type','bid_accepted','jobId',target_bid.job_post_id,'bidId',target_bid.id));
  return target_bid;
end;
$$;

revoke all on function public.accept_bid(text) from public;
grant execute on function public.accept_bid(text) to authenticated;

-- 4. Enhanced cancel_job: allows authorized sessions
create or replace function public.cancel_job(job_id text, reason text default null)
returns public.job_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target public.job_posts;
  notice public.notifications;
  is_owner boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.job_posts where id = job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;

  is_owner := (
    target.citizen_id = actor_id
    or public.is_admin()
    or exists (
      select 1 from public.web_job_authorized_sessions
      where job_id = target.id and user_id = actor_id
    )
    or exists (
      select 1 from public.web_job_contacts
      where job_id = target.id and requester_id = actor_id
    )
  );

  if not is_owner then
    raise exception 'JOB_OWNER_REQUIRED';
  end if;

  if target.status in ('COMPLETED'::public."JobStatus", 'CANCELLED'::public."JobStatus") then
    raise exception 'JOB_CANNOT_BE_CANCELLED';
  end if;

  update public.job_posts
  set status = 'CANCELLED', cancelled_at = now(), cancellation_reason = nullif(trim(reason), '')
  where id = job_id returning * into target;

  if target.assigned_electrician_id is not null then
    insert into public.notifications (user_id, type, title, message, related_type, related_id)
    values (target.assigned_electrician_id, 'job_cancelled', 'İş İptal Edildi', 'Atandığınız iş ilan sahibi tarafından iptal edildi.', 'JOB', target.id)
    returning * into notice;
    insert into public.notification_outbox (notification_id, user_id, event_type, payload)
    values (notice.id, target.assigned_electrician_id, 'job_cancelled', jsonb_build_object('jobId', target.id, 'type', 'job_cancelled'));
  end if;
  return target;
end;
$$;

revoke all on function public.cancel_job(text, text) from public;
grant execute on function public.cancel_job(text, text) to authenticated;

-- 5. Enhanced get_job_participant_contact: allows authorized sessions
create or replace function public.get_job_participant_contact(p_job_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target_job public.job_posts%rowtype;
  contact_id text;
  contact public.users%rowtype;
  web_contact public.web_job_contacts%rowtype;
  is_citizen boolean := false;
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_job from public.job_posts
  where id = p_job_id and deleted_at is null;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target_job.accepted_bid_id is null or target_job.assigned_electrician_id is null then
    raise exception 'CONTACT_NOT_AVAILABLE';
  end if;

  is_citizen := (
    actor_id = target_job.citizen_id
    or exists (
      select 1 from public.web_job_authorized_sessions
      where job_id = target_job.id and user_id = actor_id
    )
    or exists (
      select 1 from public.web_job_contacts
      where job_id = target_job.id and requester_id = actor_id
    )
  );

  if is_citizen then
    contact_id := target_job.assigned_electrician_id;
  elsif actor_id = target_job.assigned_electrician_id then
    contact_id := target_job.citizen_id;
  else
    raise exception 'FORBIDDEN';
  end if;

  if contact_id = target_job.citizen_id then
    select * into web_contact from public.web_job_contacts where job_id = p_job_id;
    if found then
      return jsonb_build_object(
        'userId', contact_id,
        'fullName', web_contact.full_name,
        'phone', web_contact.phone
      );
    end if;
  end if;

  select * into contact from public.users
  where id = contact_id and is_active = true and is_banned = false and deleted_at is null;
  if not found then raise exception 'CONTACT_NOT_AVAILABLE'; end if;

  return jsonb_build_object(
    'userId', contact.id,
    'fullName', contact.full_name,
    'phone', contact.phone
  );
end;
$$;

revoke all on function public.get_job_participant_contact(text) from public, anon;
grant execute on function public.get_job_participant_contact(text) to authenticated;
