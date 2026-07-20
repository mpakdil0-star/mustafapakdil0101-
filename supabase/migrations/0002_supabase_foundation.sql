-- Supabase foundation: Auth profile linkage, safe defaults and shared helpers.

create extension if not exists pgcrypto;

-- Prisma generates UUID strings in the application layer. Direct Supabase inserts
-- need a database-side default while existing TEXT UUIDs remain migration-safe.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users', 'legal_documents', 'user_consents', 'electrician_profiles',
    'job_posts', 'bids', 'conversations', 'messages', 'reviews', 'payments',
    'escrow_accounts', 'credits', 'notifications', 'locations',
    'support_tickets', 'support_ticket_messages', 'favorites', 'reports',
    'blocks', 'calendar_events', 'ledger_entries', 'marketplace_products',
    'showcase_items', 'forum_posts', 'forum_comments', 'job_sharing_posts'
  ] loop
    execute format(
      'alter table public.%I alter column id set default gen_random_uuid()::text',
      table_name
    );
  end loop;
end;
$$;

-- Passwords are owned exclusively by Supabase Auth after the cut-over.
alter table public.users alter column password_hash drop not null;

-- Prisma normally maintains @updatedAt. Supabase clients need the database to do it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('drop trigger if exists set_updated_at on %I.%I', target.table_schema, target.table_name);
    execute format(
      'create trigger set_updated_at before insert or update on %I.%I for each row execute function public.set_updated_at()',
      target.table_schema,
      target.table_name
    );
  end loop;
end;
$$;

-- Two legacy models use camelCase columns.
create or replace function public.set_updated_at_camel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_camel on public.legal_documents;
create trigger set_updated_at_camel
before insert or update on public.legal_documents
for each row execute function public.set_updated_at_camel();

-- Never trust client-provided ADMIN metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_type public."UserType";
  requested_name text;
begin
  requested_type := case
    when upper(coalesce(new.raw_user_meta_data ->> 'user_type', 'CITIZEN')) = 'ELECTRICIAN'
      then 'ELECTRICIAN'::public."UserType"
    else 'CITIZEN'::public."UserType"
  end;

  requested_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.users (
    id,
    email,
    password_hash,
    user_type,
    full_name,
    phone,
    is_verified,
    accepted_legal_version,
    marketing_allowed,
    last_login_at
  ) values (
    new.id::text,
    coalesce(new.email, new.id::text || '@missing.local'),
    null,
    requested_type,
    coalesce(requested_name, split_part(coalesce(new.email, 'Kullanıcı'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email_confirmed_at is not null,
    nullif(new.raw_user_meta_data ->> 'accepted_legal_version', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_allowed')::boolean, false),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    is_verified = excluded.is_verified,
    last_login_at = now();

  if requested_type = 'ELECTRICIAN' then
    insert into public.electrician_profiles (user_id, service_category)
    values (
      new.id::text,
      coalesce(nullif(new.raw_user_meta_data ->> 'service_category', ''), 'elektrik')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()::text
      and user_type = 'ADMIN'::public."UserType"
      and is_active = true
      and is_banned = false
      and deleted_at is null
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

create or replace function public.is_conversation_member(conversation_text_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations
    where id = conversation_text_id
      and auth.uid()::text in (participant_1_id, participant_2_id)
  );
$$;

revoke all on function public.is_conversation_member(text) from public;
grant execute on function public.is_conversation_member(text) to authenticated;

-- Multiple devices per account; legacy users.push_token will be retired later.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  expo_push_token text not null,
  device_id text not null,
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id),
  unique (expo_push_token)
);

create trigger set_updated_at
before insert or update on public.push_tokens
for each row execute function public.set_updated_at();

-- Transactional outbox: database writes succeed independently of Expo availability.
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id text references public.notifications(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_outbox_pending_idx
on public.notification_outbox (status, next_attempt_at)
where status in ('pending', 'failed');

create trigger set_updated_at
before insert or update on public.notification_outbox
for each row execute function public.set_updated_at();

-- Database-level invariants that were previously enforced in services.
create unique index if not exists conversations_unique_pair_job_idx
on public.conversations (
  least(participant_1_id, participant_2_id),
  greatest(participant_1_id, participant_2_id),
  coalesce(job_post_id, '')
);

create unique index if not exists one_default_location_per_user_idx
on public.locations (user_id)
where is_default = true and is_active = true;

alter table public.blocks
  drop constraint if exists blocks_not_self_check;
alter table public.blocks
  add constraint blocks_not_self_check check (blocker_id <> blocked_id);

-- Safe public projections. Do not expose email, phone, ban details or exact addresses.
create or replace view public.public_electricians
with (security_barrier = true)
as
select
  u.id,
  u.full_name,
  u.city,
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
  ep.service_category
from public.users u
join public.electrician_profiles ep on ep.user_id = u.id
where u.user_type = 'ELECTRICIAN'::public."UserType"
  and u.is_active = true
  and u.is_banned = false
  and u.deleted_at is null;

create or replace view public.public_job_posts
with (security_barrier = true)
as
select
  j.id,
  j.title,
  j.description,
  j.category,
  j.subcategory,
  j.service_category,
  jsonb_build_object(
    'city', j.location ->> 'city',
    'district', j.location ->> 'district',
    'neighborhood', j.location ->> 'neighborhood'
  ) as location,
  j.urgency_level,
  j.estimated_budget,
  j.budget_range,
  j.preferred_time,
  j.status,
  j.images,
  j.view_count,
  j.bid_count,
  j.created_at,
  u.full_name as citizen_name,
  u.profile_image_url as citizen_profile_image_url
from public.job_posts j
join public.users u on u.id = j.citizen_id
where j.status in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus")
  and j.deleted_at is null
  and u.is_active = true
  and u.is_banned = false;

revoke all on public.public_electricians from public;
revoke all on public.public_job_posts from public;
grant select on public.public_electricians to anon, authenticated;
grant select on public.public_job_posts to anon, authenticated;
