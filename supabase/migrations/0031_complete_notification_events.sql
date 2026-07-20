-- Complete the authoritative notification event chain. Notifications are the
-- durable inbox; a deferred trigger guarantees that every notification gets
-- exactly one push outbox row without duplicating RPCs that already create it.

create or replace function public.ensure_notification_has_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if exists (
    select 1 from public.notification_outbox where notification_id = new.id
  ) then
    return new;
  end if;

  payload := jsonb_strip_nulls(jsonb_build_object(
    'type', new.type,
    'relatedId', new.related_id,
    'relatedType', new.related_type,
    'jobId', case when new.related_type = 'JOB' then new.related_id else null end,
    'conversationId', case when new.related_type = 'CONVERSATION' then new.related_id else null end,
    'userId', case when new.related_type = 'USER' then new.related_id else null end,
    'actionUrl', new.action_url
  ));

  insert into public.notification_outbox (
    notification_id, user_id, event_type, payload
  ) values (
    new.id, new.user_id, new.type, payload
  );

  return new;
end;
$$;

drop trigger if exists ensure_notification_outbox_after_insert on public.notifications;
create constraint trigger ensure_notification_outbox_after_insert
after insert on public.notifications
deferrable initially deferred
for each row execute function public.ensure_notification_has_outbox();

-- Notify active admins once, when a new auth account is created.
create or replace function public.notify_admins_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'Yeni kullanıcı'), '@', 1)
  );
  insert into public.notifications (
    user_id, type, title, message, related_type, related_id, action_url
  )
  select
    admin_user.id,
    'new_user_registered',
    'Yeni Kullanıcı Kaydı',
    display_name || ' uygulamaya kayıt oldu.',
    'USER',
    new.id::text,
    '/admin/users?userId=' || new.id::text
  from public.users admin_user
  where admin_user.user_type = 'ADMIN'::public."UserType"
    and admin_user.is_active = true
    and admin_user.is_banned = false
    and admin_user.deleted_at is null
    and admin_user.id <> new.id::text;

  return new;
end;
$$;

drop trigger if exists zz_notify_admins_for_new_auth_user on auth.users;
create trigger zz_notify_admins_for_new_auth_user
after insert on auth.users
for each row execute function public.notify_admins_for_new_auth_user();

-- Reviews can be created either during completion or afterwards. One trigger
-- covers both paths.
create or replace function public.notify_review_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reviewed_id = new.reviewer_id then return new; end if;

  insert into public.notifications (
    user_id, type, title, message, related_type, related_id, action_url
  ) values (
    new.reviewed_id,
    'new_review',
    'Yeni Değerlendirme',
    'Tamamlanan iş için yeni bir değerlendirme aldınız.',
    'JOB',
    new.job_post_id,
    '/jobs/' || new.job_post_id
  );
  return new;
end;
$$;

drop trigger if exists notify_review_recipient_after_insert on public.reviews;
create trigger notify_review_recipient_after_insert
after insert on public.reviews
for each row execute function public.notify_review_recipient();

-- Messages now create both a durable inbox item and a push with a useful title,
-- preview and conversation route.
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
  sender_name text;
  message_preview text;
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
      last_message_preview = left(coalesce(nullif(trim(message_content), ''), '[' || message_type::text || ']'), 100),
      unread_count_participant_1 = unread_count_participant_1 +
        case when participant_1_id = recipient_id then 1 else 0 end,
      unread_count_participant_2 = unread_count_participant_2 +
        case when participant_2_id = recipient_id then 1 else 0 end
  where id = conversation_id;

  select full_name into sender_name from public.users where id = actor_id;
  message_preview := case
    when length(trim(message_content)) > 0 then left(trim(message_content), 120)
    when message_type = 'IMAGE'::public."MessageType" then 'Bir fotoğraf gönderdi.'
    when message_type = 'FILE'::public."MessageType" then 'Bir dosya gönderdi.'
    else 'Yeni bir mesaj gönderdi.'
  end;

  insert into public.notifications (
    user_id, type, title, message, related_type, related_id, action_url
  ) values (
    recipient_id,
    'new_message',
    coalesce(sender_name, 'Yeni Mesaj'),
    message_preview,
    'CONVERSATION',
    conversation_id,
    '/messages/' || conversation_id
  );

  return result;
end;
$$;

revoke all on function public.send_message(text, text, public."MessageType", text, text, integer) from public;
grant execute on function public.send_message(text, text, public."MessageType", text, text, integer) to authenticated;

-- Inform the citizen when an electrician materially updates or withdraws a bid.
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
  v_citizen_id text;
  notice public.notifications;
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

  select j.citizen_id into v_citizen_id from public.job_posts j where j.id = result.job_post_id;
  insert into public.notifications (user_id, type, title, message, related_type, related_id, action_url)
  values (v_citizen_id, 'bid_updated', 'Teklif Güncellendi', 'İlanınıza verilen teklif güncellendi.', 'JOB', result.job_post_id, '/jobs/' || result.job_post_id)
  returning * into notice;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (notice.id, v_citizen_id, 'bid_updated', jsonb_build_object('type','bid_updated','jobId',result.job_post_id,'bidId',result.id));
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
  v_citizen_id text;
  notice public.notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into result from public.bids where id = bid_id for update;
  if not found then raise exception 'BID_NOT_FOUND'; end if;
  if result.electrician_id <> actor_id then raise exception 'BID_OWNER_REQUIRED'; end if;
  if result.status <> 'PENDING'::public."BidStatus" then raise exception 'BID_NOT_PENDING'; end if;
  update public.bids set status = 'WITHDRAWN' where id = bid_id returning * into result;
  update public.job_posts set bid_count = greatest(bid_count - 1, 0) where id = result.job_post_id returning job_posts.citizen_id into v_citizen_id;
  insert into public.notifications (user_id, type, title, message, related_type, related_id, action_url)
  values (v_citizen_id, 'bid_withdrawn', 'Teklif Geri Çekildi', 'İlanınıza verilen bir teklif geri çekildi.', 'JOB', result.job_post_id, '/jobs/' || result.job_post_id)
  returning * into notice;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (notice.id, v_citizen_id, 'bid_withdrawn', jsonb_build_object('type','bid_withdrawn','jobId',result.job_post_id,'bidId',result.id));
  return result;
end;
$$;

revoke all on function public.update_bid(text, numeric, integer, timestamptz, text, jsonb) from public;
revoke all on function public.withdraw_bid(text) from public;
grant execute on function public.update_bid(text, numeric, integer, timestamptz, text, jsonb) to authenticated;
grant execute on function public.withdraw_bid(text) to authenticated;

-- When one bid is accepted, notify the other electricians whose pending bids
-- are automatically rejected as part of the same transaction.
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
  set status = 'IN_PROGRESS', assigned_electrician_id = target_bid.electrician_id, accepted_bid_id = target_bid.id
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
