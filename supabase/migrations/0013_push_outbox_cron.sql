-- Secure notification outbox claiming, Expo ticket storage and scheduled Edge invocation.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_runtime_config (
  id smallint primary key default 1 check (id = 1),
  cron_secret uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
insert into public.push_runtime_config (id) values (1) on conflict (id) do nothing;
alter table public.push_runtime_config enable row level security;
alter table public.push_runtime_config force row level security;
revoke all on public.push_runtime_config from anon, authenticated;

create table if not exists public.push_delivery_tickets (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  expo_push_token text not null,
  expo_ticket_id text,
  status text not null check (status in ('ok', 'error')),
  error_code text,
  error_message text,
  receipt_status text,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists push_delivery_receipt_idx
on public.push_delivery_tickets (receipt_checked_at, created_at)
where expo_ticket_id is not null and receipt_checked_at is null;
alter table public.push_delivery_tickets enable row level security;
alter table public.push_delivery_tickets force row level security;
revoke all on public.push_delivery_tickets from anon, authenticated;

alter table public.notifications replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then alter publication supabase_realtime add table public.notifications; end if;
end;
$$;

create or replace function public.claim_notification_outbox(batch_size integer default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    select id
    from public.notification_outbox
    where status in ('pending', 'failed')
      and next_attempt_at <= now()
      and attempt_count < 8
    order by created_at
    for update skip locked
    limit least(greatest(batch_size, 1), 100)
  )
  update public.notification_outbox outbox
  set status = 'processing',
      attempt_count = attempt_count + 1,
      last_error = null
  from claimed
  where outbox.id = claimed.id
  returning outbox.*;
end;
$$;
revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;

-- Replace an earlier schedule safely when migrations are replayed.
do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'process-push-outbox';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end;
$$;

select cron.schedule(
  'process-push-outbox',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://htsdqvlyyiyawtmuhryi.supabase.co/functions/v1/process-push-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select cron_secret::text from public.push_runtime_config where id = 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $cron$
);
