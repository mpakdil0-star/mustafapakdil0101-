-- Reliable server-side reminders for electrician calendar and ledger tools.
-- The database is authoritative; each reminder is enqueued at most once.

alter table public.calendar_events
add column if not exists reminder_sent_at timestamptz;

alter table public.ledger_entries
add column if not exists reminder_at timestamptz,
add column if not exists reminder_sent_at timestamptz;

create index if not exists calendar_events_due_reminder_idx
on public.calendar_events (reminder_at)
where has_reminder = true and reminder_sent_at is null;

create index if not exists ledger_entries_due_reminder_idx
on public.ledger_entries (reminder_at)
where has_reminder = true and reminder_sent_at is null;

create or replace function public.reset_calendar_reminder_delivery()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.reminder_sent_at := null;
  elsif not coalesce(new.has_reminder, false) or new.reminder_at is null then
    new.reminder_sent_at := null;
  elsif new.has_reminder is distinct from old.has_reminder
     or new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_calendar_reminder_delivery_before_write on public.calendar_events;
create trigger reset_calendar_reminder_delivery_before_write
before insert or update on public.calendar_events
for each row execute function public.reset_calendar_reminder_delivery();

create or replace function public.reset_ledger_reminder_delivery()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.reminder_sent_at := null;
  elsif not coalesce(new.has_reminder, false) or new.reminder_at is null then
    new.reminder_sent_at := null;
  elsif new.has_reminder is distinct from old.has_reminder
     or new.reminder_at is distinct from old.reminder_at then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_ledger_reminder_delivery_before_write on public.ledger_entries;
create trigger reset_ledger_reminder_delivery_before_write
before insert or update on public.ledger_entries
for each row execute function public.reset_ledger_reminder_delivery();

create or replace function public.enqueue_due_reminders(batch_size integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_batch_size integer := greatest(1, least(coalesce(batch_size, 200), 1000));
  calendar_count integer := 0;
  ledger_count integer := 0;
begin
  with due as (
    select event.id
    from public.calendar_events event
    join public.users reminder_user on reminder_user.id = event.user_id
    where event.has_reminder = true
      and event.reminder_at is not null
      and event.reminder_at <= now()
      and event.reminder_sent_at is null
      and lower(coalesce(event.status, 'pending')) not in ('completed', 'cancelled', 'canceled')
      and reminder_user.is_active = true
      and reminder_user.is_banned = false
      and reminder_user.deleted_at is null
    order by event.reminder_at, event.id
    limit safe_batch_size
    for update of event skip locked
  ), marked as (
    update public.calendar_events event
    set reminder_sent_at = now()
    from due
    where event.id = due.id
      and event.reminder_sent_at is null
    returning event.*
  )
  insert into public.notifications (
    user_id, type, title, message, related_type, related_id, action_url
  )
  select
    marked.user_id,
    'calendar_reminder',
    'Takvim Hatırlatıcısı',
    marked.title || case
      when nullif(trim(coalesce(marked.note, '')), '') is not null
        then ': ' || trim(marked.note)
      else ' etkinliğinizin zamanı geldi.'
    end,
    'CALENDAR_EVENT',
    marked.id,
    '/tools/calendar'
  from marked;
  get diagnostics calendar_count = row_count;

  with due as (
    select entry.id
    from public.ledger_entries entry
    join public.users reminder_user on reminder_user.id = entry.user_id
    where entry.has_reminder = true
      and entry.reminder_at is not null
      and entry.reminder_at <= now()
      and entry.reminder_sent_at is null
      and lower(coalesce(entry.status, 'pending')) = 'pending'
      and reminder_user.is_active = true
      and reminder_user.is_banned = false
      and reminder_user.deleted_at is null
    order by entry.reminder_at, entry.id
    limit safe_batch_size
    for update of entry skip locked
  ), marked as (
    update public.ledger_entries entry
    set reminder_sent_at = now()
    from due
    where entry.id = due.id
      and entry.reminder_sent_at is null
    returning entry.*
  )
  insert into public.notifications (
    user_id, type, title, message, related_type, related_id, action_url
  )
  select
    marked.user_id,
    'ledger_reminder',
    'Hesap Defteri Hatırlatıcısı',
    marked.person_name || ' için ' ||
      case when marked.type = 'receivable' then 'alacak' else 'borç' end ||
      ' kaydınızın zamanı geldi: ' || trim(to_char(marked.amount, 'FM999999990D00')) || ' TL',
    'LEDGER_ENTRY',
    marked.id,
    '/tools/ledger'
  from marked;
  get diagnostics ledger_count = row_count;

  return jsonb_build_object(
    'calendarEnqueued', calendar_count,
    'ledgerEnqueued', ledger_count,
    'totalEnqueued', calendar_count + ledger_count
  );
end;
$$;

revoke all on function public.enqueue_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.enqueue_due_reminders(integer) to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'enqueue-due-reminders';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'enqueue-due-reminders',
  '* * * * *',
  $cron$select public.enqueue_due_reminders(200);$cron$
);
