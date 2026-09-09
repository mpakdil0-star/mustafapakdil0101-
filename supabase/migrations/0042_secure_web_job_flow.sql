-- Secure, accountless web job flow.
-- Web visitors use a Supabase anonymous session, so ownership and all later
-- job/bid mutations are still enforced by auth.uid() and the existing RLS.

create table if not exists public.web_job_contacts (
  job_id text primary key references public.job_posts(id) on delete cascade,
  requester_id text not null references public.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  retention_until timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_job_contacts_requester_idx
on public.web_job_contacts(requester_id);

alter table public.web_job_contacts enable row level security;
revoke all on public.web_job_contacts from public, anon, authenticated;

create or replace function public.create_web_job(
  p_title text,
  p_description text,
  p_customer_name text,
  p_customer_phone text,
  p_category text,
  p_service_category text,
  p_urgency_level text,
  p_location jsonb,
  p_terms_version text,
  p_privacy_notice_version text
)
returns public.job_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  actor public.users%rowtype;
  created_job public.job_posts;
  normalized_phone text;
  normalized_service text := lower(btrim(coalesce(p_service_category, '')));
  normalized_urgency text := upper(btrim(coalesce(p_urgency_level, 'MEDIUM')));
  city_name text := nullif(btrim(p_location ->> 'city'), '');
  district_name text := nullif(btrim(p_location ->> 'district'), '');
  latitude_value numeric;
  longitude_value numeric;
  allowed_services constant text[] := array[
    'elektrik', 'cilingir', 'klima', 'beyaz-esya', 'tesisat', 'temizlik',
    'nakliyat', 'boya-badana', 'koltuk-hali', 'mobilya-montaj',
    'kucuk-nakliye', 'kombi-servis', 'asansor', 'bocek-ilaclama',
    'guvenlik-kamera'
  ];
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into actor from public.users where id = actor_id for update;
  if not found or actor.user_type::text <> 'CITIZEN' or not actor.is_active
     or actor.is_banned or actor.deleted_at is not null then
    raise exception 'ACCOUNT_NOT_ELIGIBLE';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 3 and 160 then
    raise exception 'INVALID_TITLE';
  end if;
  if length(btrim(coalesce(p_description, ''))) > 2000 then
    raise exception 'INVALID_DESCRIPTION';
  end if;
  if length(btrim(coalesce(p_category, ''))) not between 2 and 160 then
    raise exception 'INVALID_SERVICE_CATEGORY';
  end if;
  if length(btrim(coalesce(p_customer_name, ''))) not between 2 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  normalized_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  if normalized_phone ~ '^90[5][0-9]{9}$' then
    normalized_phone := substring(normalized_phone from 3);
  end if;
  if normalized_phone !~ '^0?5[0-9]{9}$' then raise exception 'INVALID_PHONE'; end if;
  if left(normalized_phone, 1) <> '0' then normalized_phone := '0' || normalized_phone; end if;

  if not (normalized_service = any(allowed_services)) then
    raise exception 'INVALID_SERVICE_CATEGORY';
  end if;
  if normalized_urgency not in ('LOW', 'MEDIUM', 'HIGH') then
    raise exception 'INVALID_URGENCY';
  end if;
  if city_name is null or district_name is null then raise exception 'INVALID_LOCATION'; end if;
  if length(city_name) > 80 or length(district_name) > 100
     or length(coalesce(p_location ->> 'neighborhood', '')) > 120
     or length(coalesce(p_location ->> 'address', '')) > 500 then
    raise exception 'INVALID_LOCATION';
  end if;

  begin latitude_value := nullif(p_location ->> 'latitude', '')::numeric;
  exception when invalid_text_representation then raise exception 'INVALID_COORDINATES'; end;
  begin longitude_value := nullif(p_location ->> 'longitude', '')::numeric;
  exception when invalid_text_representation then raise exception 'INVALID_COORDINATES'; end;
  if latitude_value is not null and (latitude_value < -90 or latitude_value > 90) then
    raise exception 'INVALID_COORDINATES';
  end if;
  if longitude_value is not null and (longitude_value < -180 or longitude_value > 180) then
    raise exception 'INVALID_COORDINATES';
  end if;

  if nullif(btrim(coalesce(p_terms_version, '')), '') is null
     or nullif(btrim(coalesce(p_privacy_notice_version, '')), '') is null then
    raise exception 'LEGAL_NOTICE_REQUIRED';
  end if;

  -- Prevent accidental double submits and basic automated abuse per session.
  if exists (
    select 1 from public.job_posts
    where citizen_id = actor_id and created_at > now() - interval '45 seconds'
  ) then raise exception 'TOO_MANY_REQUESTS'; end if;
  if (
    select count(*) from public.job_posts
    where citizen_id = actor_id and created_at > now() - interval '1 hour'
  ) >= 4 then raise exception 'TOO_MANY_REQUESTS'; end if;

  update public.users
  set full_name = btrim(p_customer_name),
      city = city_name,
      accepted_legal_version = btrim(p_terms_version),
      marketing_allowed = false,
      last_seen_at = now()
  where id = actor_id;

  insert into public.job_posts (
    id, citizen_id, title, description, category, service_category,
    location, urgency_level, status, images, view_count, bid_count,
    expires_at, created_at, updated_at
  ) values (
    gen_random_uuid()::text,
    actor_id,
    btrim(p_title),
    coalesce(nullif(btrim(coalesce(p_description, '')), ''), 'Detay belirtilmedi.'),
    left(btrim(p_category), 160),
    normalized_service,
    jsonb_strip_nulls(jsonb_build_object(
      'city', city_name,
      'district', district_name,
      'neighborhood', nullif(btrim(p_location ->> 'neighborhood'), ''),
      'address', nullif(btrim(p_location ->> 'address'), ''),
      'latitude', latitude_value,
      'longitude', longitude_value
    )),
    normalized_urgency::public."UrgencyLevel",
    'OPEN'::public."JobStatus",
    array[]::text[], 0, 0,
    now() + interval '7 days', now(), now()
  ) returning * into created_job;

  insert into public.web_job_contacts (job_id, requester_id, full_name, phone)
  values (created_job.id, actor_id, btrim(p_customer_name), normalized_phone);

  -- Aydınlatma is recorded as PRESENTED, not as consent. Contract acceptance
  -- is kept separately to avoid bundling legally different declarations.
  insert into public.user_consents (
    id, user_id, document_type, document_version, action, created_at
  ) values
    (gen_random_uuid()::text, actor_id, 'WEB_PRIVACY_NOTICE', btrim(p_privacy_notice_version), 'PRESENTED', now()),
    (gen_random_uuid()::text, actor_id, 'WEB_TERMS', btrim(p_terms_version), 'ACCEPTED', now());

  return created_job;
end;
$$;

revoke all on function public.create_web_job(text,text,text,text,text,text,text,jsonb,text,text)
from public, anon;
grant execute on function public.create_web_job(text,text,text,text,text,text,text,jsonb,text,text)
to authenticated;

-- Preserve the existing participant-contact API while supporting web-created
-- jobs whose contact details are deliberately isolated from public.users.
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
begin
  if actor_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_job from public.job_posts
  where id = p_job_id and deleted_at is null;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target_job.accepted_bid_id is null or target_job.assigned_electrician_id is null then
    raise exception 'CONTACT_NOT_AVAILABLE';
  end if;

  if actor_id = target_job.citizen_id then
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

-- Only verified and available professionals should receive new-job pushes.
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
  if new.deleted_at is not null or new.status::text not in ('OPEN', 'BIDDING') or job_city is null then
    return new;
  end if;

  with matching_electricians as (
    select distinct u.id as user_id
    from public.users u
    join public.electrician_profiles ep on ep.user_id = u.id
    where u.user_type::text = 'ELECTRICIAN'
      and u.id <> new.citizen_id
      and u.is_active = true and u.is_banned = false and u.deleted_at is null
      and ep.is_available = true
      and ep.verification_status::text = 'APPROVED'
      and lower(btrim(ep.service_category)) = lower(job_service_category)
      and (
        exists (
          select 1 from public.locations l
          where l.user_id = u.id and l.is_active = true
            and lower(btrim(l.city)) = lower(job_city)
            and (
              job_district is null or nullif(btrim(l.district), '') is null
              or lower(btrim(l.district)) = lower(job_district)
              or lower(btrim(l.district)) in ('tüm şehir', 'merkez')
            )
        )
        or (
          not exists (select 1 from public.locations l_any where l_any.user_id = u.id and l_any.is_active = true)
          and lower(btrim(coalesce(u.city, ''))) = lower(job_city)
        )
      )
  ), inserted_notifications as (
    insert into public.notifications (user_id, type, title, message, related_type, related_id, action_url)
    select
      match.user_id,
      'new_job',
      case when new.urgency_level::text = 'HIGH' then U&'Yeni acil i\015F talebi' else U&'Yeni i\015F talebi' end,
      format(U&'%s b\00F6lgesinde yeni bir talep yay\0131nland\0131.', coalesce(job_district, job_city)),
      'JOB', new.id, '/jobs/' || new.id
    from matching_electricians match
    on conflict (user_id, related_id) where type = 'new_job' and related_id is not null do nothing
    returning id, user_id
  )
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  select notice.id, notice.user_id, 'new_job', jsonb_build_object(
    'type', 'new_job', 'jobId', new.id, 'serviceCategory', job_service_category,
    'city', job_city, 'district', job_district,
    'urgencyLevel', new.urgency_level::text
  ) from inserted_notifications notice;

  return new;
end;
$$;

revoke all on function public.notify_matching_electricians_for_new_job()
from public, anon, authenticated;

-- Minimize web contact data after the declared retention window. Active jobs
-- are deliberately excluded so a long-running dispute or service is not
-- silently deprived of required contact data.
create or replace function public.purge_expired_web_job_contacts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  update public.job_posts j
  set description = U&'Saklama s\00FCresi doldu\011Fu i\00E7in talep ayr\0131nt\0131lar\0131 kald\0131r\0131ld\0131.',
      location = jsonb_strip_nulls(jsonb_build_object(
        'city', j.location ->> 'city',
        'district', j.location ->> 'district'
      )),
      updated_at = now()
  from public.web_job_contacts wc
  where wc.job_id = j.id
    and wc.retention_until <= now()
    and j.status::text in ('COMPLETED', 'CANCELLED', 'EXPIRED');

  delete from public.web_job_contacts wc
  using public.job_posts j
  where wc.job_id = j.id
    and wc.retention_until <= now()
    and j.status::text in ('COMPLETED', 'CANCELLED', 'EXPIRED');
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_web_job_contacts()
from public, anon, authenticated;
grant execute on function public.purge_expired_web_job_contacts() to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'purge-expired-web-job-contacts';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end;
$$;

select cron.schedule(
  'purge-expired-web-job-contacts',
  '17 3 * * *',
  $cron$select public.purge_expired_web_job_contacts();$cron$
);
