-- Atomic business operations. Client identity always comes from auth.uid().

create or replace function public.create_bid(
  job_id text,
  bid_amount numeric,
  validity_days integer default 7,
  estimated_start_at timestamptz default null,
  bid_message text default '',
  cost_items jsonb default null
)
returns public.bids
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target_job public.job_posts;
  balance numeric(10,2);
  created_bid public.bids;
  created_notification public.notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if bid_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if validity_days not in (3, 7, 30) then raise exception 'INVALID_VALIDITY'; end if;
  if length(trim(bid_message)) = 0 then raise exception 'MESSAGE_REQUIRED'; end if;
  if bid_message ~ '(\+?90[[:space:]-]?)?0?5[0-9]{2}[[:space:]-]?[0-9]{3}[[:space:]-]?[0-9]{2}[[:space:]-]?[0-9]{2}' then
    raise exception 'PHONE_NUMBER_NOT_ALLOWED';
  end if;

  select * into target_job
  from public.job_posts
  where id = job_id
  for update;

  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target_job.status not in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus") then
    raise exception 'JOB_NOT_OPEN';
  end if;
  if target_job.citizen_id = actor_id then raise exception 'OWN_JOB'; end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = actor_id and blocked_id = target_job.citizen_id)
       or (blocker_id = target_job.citizen_id and blocked_id = actor_id)
  ) then raise exception 'USER_BLOCKED'; end if;

  if exists (
    select 1 from public.bids
    where job_post_id = job_id and electrician_id = actor_id
      and status in ('PENDING'::public."BidStatus", 'ACCEPTED'::public."BidStatus")
  ) then raise exception 'ACTIVE_BID_EXISTS'; end if;

  select ep.credit_balance into balance
  from public.users u
  join public.electrician_profiles ep on ep.user_id = u.id
  where u.id = actor_id
    and u.user_type = 'ELECTRICIAN'::public."UserType"
    and u.is_active = true and u.is_banned = false and u.deleted_at is null
  for update of ep;

  if not found then raise exception 'ELECTRICIAN_REQUIRED'; end if;
  if balance < 1 then raise exception 'INSUFFICIENT_CREDIT'; end if;

  insert into public.bids (
    job_post_id, electrician_id, amount, estimated_duration,
    estimated_start_date, message, status, credit_spent, expires_at, cost_items
  ) values (
    job_id, actor_id, bid_amount, validity_days * 24,
    estimated_start_at, trim(bid_message), 'PENDING', 1,
    now() + make_interval(days => validity_days), cost_items
  ) returning * into created_bid;

  update public.electrician_profiles
  set credit_balance = credit_balance - 1
  where user_id = actor_id;

  insert into public.credits (
    user_id, amount, transaction_type, related_id, description, balance_after
  ) values (
    actor_id, -1, 'BID_SPENT', created_bid.id,
    'İlan için teklif kredisi', balance - 1
  );

  update public.job_posts
  set bid_count = bid_count + 1, status = 'BIDDING'
  where id = job_id;

  insert into public.notifications (user_id, type, title, message, related_type, related_id)
  values (
    target_job.citizen_id, 'bid_received', 'Yeni Teklif',
    'İlanınıza yeni bir teklif verildi.', 'JOB', job_id
  ) returning * into created_notification;

  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (
    created_notification.id,
    target_job.citizen_id,
    'bid_received',
    jsonb_build_object('jobId', job_id, 'bidId', created_bid.id, 'type', 'bid_received')
  );

  return created_bid;
end;
$$;

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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_bid from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;

  select * into target_job from public.job_posts where id = target_bid.job_post_id for update;
  if target_job.citizen_id <> actor_id then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if target_bid.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  if target_job.status not in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus") then
    raise exception 'JOB_NOT_OPEN';
  end if;

  update public.bids
  set status = 'REJECTED', rejected_at = now()
  where job_post_id = target_bid.job_post_id
    and id <> bid_id and status = 'PENDING';

  update public.bids
  set status = 'ACCEPTED', accepted_at = now()
  where id = bid_id
  returning * into target_bid;

  update public.job_posts
  set status = 'IN_PROGRESS',
      assigned_electrician_id = target_bid.electrician_id,
      accepted_bid_id = target_bid.id
  where id = target_bid.job_post_id;

  insert into public.notifications (user_id, type, title, message, related_type, related_id)
  values (
    target_bid.electrician_id, 'bid_accepted', 'Teklifiniz Kabul Edildi',
    'Teklifiniz ilan sahibi tarafından kabul edildi.', 'JOB', target_bid.job_post_id
  ) returning * into created_notification;

  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (
    created_notification.id,
    target_bid.electrician_id,
    'bid_accepted',
    jsonb_build_object('jobId', target_bid.job_post_id, 'bidId', target_bid.id, 'type', 'bid_accepted')
  );

  return target_bid;
end;
$$;

create or replace function public.find_or_create_conversation(recipient_id text, job_id text default null)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.conversations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if actor_id = recipient_id then raise exception 'SELF_CONVERSATION_NOT_ALLOWED'; end if;
  if not exists (select 1 from public.users where id = recipient_id and deleted_at is null) then
    raise exception 'RECIPIENT_NOT_FOUND';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = actor_id and blocked_id = recipient_id)
       or (blocker_id = recipient_id and blocked_id = actor_id)
  ) then raise exception 'USER_BLOCKED'; end if;

  select * into result
  from public.conversations
  where least(participant_1_id, participant_2_id) = least(actor_id, recipient_id)
    and greatest(participant_1_id, participant_2_id) = greatest(actor_id, recipient_id)
    and coalesce(job_post_id, '') = coalesce(job_id, '')
  limit 1;

  if result.id is null then
    insert into public.conversations (job_post_id, participant_1_id, participant_2_id)
    values (job_id, actor_id, recipient_id)
    on conflict (
      (least(participant_1_id, participant_2_id)),
      (greatest(participant_1_id, participant_2_id)),
      (coalesce(job_post_id, ''))
    ) do nothing
    returning * into result;

    if result.id is null then
      select * into result
      from public.conversations
      where least(participant_1_id, participant_2_id) = least(actor_id, recipient_id)
        and greatest(participant_1_id, participant_2_id) = greatest(actor_id, recipient_id)
        and coalesce(job_post_id, '') = coalesce(job_id, '')
      limit 1;
    end if;
  end if;

  return result;
end;
$$;

create or replace function public.send_message(
  conversation_id text,
  message_content text,
  message_type public."MessageType" default 'TEXT',
  media_url text default null,
  file_name text default null,
  file_size integer default null
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target_conversation public.conversations;
  recipient_id text;
  result public.messages;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(message_content)) = 0 and media_url is null then raise exception 'EMPTY_MESSAGE'; end if;

  select * into target_conversation
  from public.conversations
  where id = conversation_id
    and actor_id in (participant_1_id, participant_2_id)
  for update;
  if not found then raise exception 'CONVERSATION_NOT_FOUND'; end if;

  recipient_id := case
    when target_conversation.participant_1_id = actor_id then target_conversation.participant_2_id
    else target_conversation.participant_1_id
  end;

  if exists (
    select 1 from public.blocks
    where (blocker_id = actor_id and blocked_id = recipient_id)
       or (blocker_id = recipient_id and blocked_id = actor_id)
  ) then raise exception 'USER_BLOCKED'; end if;

  insert into public.messages (
    conversation_id, sender_id, recipient_id, content,
    message_type, media_url, file_name, file_size
  ) values (
    conversation_id, actor_id, recipient_id, coalesce(trim(message_content), ''),
    message_type, media_url, file_name, file_size
  ) returning * into result;

  update public.conversations
  set last_message_at = now(),
      last_message_preview = left(coalesce(trim(message_content), '[' || message_type::text || ']'), 100),
      unread_count_participant_1 = unread_count_participant_1 +
        case when participant_1_id = recipient_id then 1 else 0 end,
      unread_count_participant_2 = unread_count_participant_2 +
        case when participant_2_id = recipient_id then 1 else 0 end
  where id = conversation_id;

  insert into public.notification_outbox (user_id, event_type, payload)
  values (
    recipient_id,
    'new_message',
    jsonb_build_object('conversationId', conversation_id, 'messageId', result.id, 'type', 'new_message')
  );

  return result;
end;
$$;

create or replace function public.mark_conversation_read(conversation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target_conversation public.conversations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target_conversation
  from public.conversations
  where id = conversation_id and actor_id in (participant_1_id, participant_2_id)
  for update;
  if not found then raise exception 'CONVERSATION_NOT_FOUND'; end if;

  update public.messages
  set is_read = true, read_at = now()
  where messages.conversation_id = mark_conversation_read.conversation_id
    and recipient_id = actor_id and is_read = false;

  update public.conversations
  set unread_count_participant_1 = case when participant_1_id = actor_id then 0 else unread_count_participant_1 end,
      unread_count_participant_2 = case when participant_2_id = actor_id then 0 else unread_count_participant_2 end
  where id = conversation_id;
end;
$$;

revoke all on function public.create_bid(text, numeric, integer, timestamptz, text, jsonb) from public;
revoke all on function public.accept_bid(text) from public;
revoke all on function public.find_or_create_conversation(text, text) from public;
revoke all on function public.send_message(text, text, public."MessageType", text, text, integer) from public;
revoke all on function public.mark_conversation_read(text) from public;

grant execute on function public.create_bid(text, numeric, integer, timestamptz, text, jsonb) to authenticated;
grant execute on function public.accept_bid(text) to authenticated;
grant execute on function public.find_or_create_conversation(text, text) to authenticated;
grant execute on function public.send_message(text, text, public."MessageType", text, text, integer) to authenticated;
grant execute on function public.mark_conversation_read(text) to authenticated;
