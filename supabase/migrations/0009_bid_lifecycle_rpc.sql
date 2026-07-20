-- Remaining bid lifecycle operations and concurrency guard.

create unique index if not exists one_active_bid_per_electrician_job_idx
on public.bids (job_post_id, electrician_id)
where status in ('PENDING'::public."BidStatus", 'ACCEPTED'::public."BidStatus");

alter table public.bids replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bids'
  ) then
    alter publication supabase_realtime add table public.bids;
  end if;
end;
$$;

create or replace function public.update_bid(
  bid_id text,
  bid_amount numeric default null,
  validity_days integer default null,
  estimated_start_at timestamptz default null,
  bid_message text default null,
  cost_items jsonb default null
)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.bids;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  if result.electrician_id <> actor_id then raise exception 'BID_OWNER_REQUIRED'; end if;
  if result.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  if bid_amount is not null and bid_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if validity_days is not null and validity_days not in (3, 7, 30) then raise exception 'INVALID_VALIDITY'; end if;
  if bid_message is not null and length(trim(bid_message)) = 0 then raise exception 'MESSAGE_REQUIRED'; end if;
  if bid_message is not null and bid_message ~ '(\+?90[[:space:]-]?)?0?5[0-9]{2}[[:space:]-]?[0-9]{3}[[:space:]-]?[0-9]{2}[[:space:]-]?[0-9]{2}' then
    raise exception 'PHONE_NUMBER_NOT_ALLOWED';
  end if;

  update public.bids
  set amount = coalesce(bid_amount, amount),
      estimated_duration = case when validity_days is null then estimated_duration else validity_days * 24 end,
      expires_at = case when validity_days is null then expires_at else now() + make_interval(days => validity_days) end,
      estimated_start_date = coalesce(estimated_start_at, estimated_start_date),
      message = coalesce(nullif(trim(bid_message), ''), message),
      cost_items = coalesce(update_bid.cost_items, bids.cost_items)
  where id = bid_id returning * into result;
  return result;
end;
$$;

create or replace function public.reject_bid(bid_id text)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.bids;
  job public.job_posts;
  notice public.notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  select * into job from public.job_posts where id = result.job_post_id;
  if job.citizen_id <> actor_id then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if result.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  update public.bids set status = 'REJECTED', rejected_at = now() where id = bid_id returning * into result;
  insert into public.notifications (user_id, type, title, message, related_type, related_id)
  values (result.electrician_id, 'bid_rejected', 'Teklif Reddedildi', 'İlan için verdiğiniz teklif kabul edilmedi.', 'JOB', result.job_post_id)
  returning * into notice;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (notice.id, result.electrician_id, 'bid_rejected', jsonb_build_object('jobId', result.job_post_id, 'bidId', result.id, 'type', 'bid_rejected'));
  return result;
end;
$$;

create or replace function public.withdraw_bid(bid_id text)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.bids;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  if result.electrician_id <> actor_id then raise exception 'BID_OWNER_REQUIRED'; end if;
  if result.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  update public.bids set status = 'WITHDRAWN' where id = bid_id returning * into result;
  update public.job_posts set bid_count = greatest(bid_count - 1, 0) where id = result.job_post_id;
  return result;
end;
$$;

create or replace function public.delete_bid(bid_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target public.bids;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  if target.electrician_id <> actor_id and not public.is_admin() then raise exception 'BID_OWNER_REQUIRED'; end if;
  if target.status not in ('REJECTED'::public."BidStatus", 'WITHDRAWN'::public."BidStatus", 'EXPIRED'::public."BidStatus") then
    raise exception 'BID_CANNOT_BE_DELETED';
  end if;
  delete from public.bids where id = bid_id;
end;
$$;

create or replace function public.request_bid_update(bid_id text)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.bids;
  job public.job_posts;
  notice public.notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.bids where id = bid_id;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  select * into job from public.job_posts where id = result.job_post_id;
  if job.citizen_id <> actor_id then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if result.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  insert into public.notifications (user_id, type, title, message, related_type, related_id)
  values (result.electrician_id, 'bid_update_requested', 'Teklif Güncelleme İsteği', 'İlan sahibi teklifinizi güncellemenizi istiyor.', 'BID', result.id)
  returning * into notice;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (notice.id, result.electrician_id, 'bid_update_requested', jsonb_build_object('jobId', result.job_post_id, 'bidId', result.id, 'type', 'bid_update_requested'));
  return result;
end;
$$;

revoke all on function public.update_bid(text, numeric, integer, timestamptz, text, jsonb) from public;
revoke all on function public.reject_bid(text) from public;
revoke all on function public.withdraw_bid(text) from public;
revoke all on function public.delete_bid(text) from public;
revoke all on function public.request_bid_update(text) from public;
grant execute on function public.update_bid(text, numeric, integer, timestamptz, text, jsonb) to authenticated;
grant execute on function public.reject_bid(text) to authenticated;
grant execute on function public.withdraw_bid(text) to authenticated;
grant execute on function public.delete_bid(text) to authenticated;
grant execute on function public.request_bid_update(text) to authenticated;
