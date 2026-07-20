-- Atomic job cancellation, deletion and completion workflows.

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
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.job_posts where id = job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target.citizen_id <> actor_id and not public.is_admin() then raise exception 'JOB_OWNER_REQUIRED'; end if;
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

create or replace function public.delete_job(job_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target public.job_posts;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.job_posts where id = job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target.citizen_id <> actor_id and not public.is_admin() then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if target.status in ('IN_PROGRESS'::public."JobStatus", 'PENDING_CONFIRMATION'::public."JobStatus", 'COMPLETED'::public."JobStatus") then
    raise exception 'ACTIVE_JOB_CANNOT_BE_DELETED';
  end if;
  update public.job_posts set deleted_at = now() where id = job_id;
end;
$$;

create or replace function public.complete_job(
  job_id text,
  review_rating integer default null,
  review_comment text default null
)
returns public.job_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target public.job_posts;
  notice public.notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target from public.job_posts where id = job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target.citizen_id <> actor_id then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if target.assigned_electrician_id is null then raise exception 'NO_ASSIGNED_ELECTRICIAN'; end if;
  if target.status not in ('IN_PROGRESS'::public."JobStatus", 'PENDING_CONFIRMATION'::public."JobStatus") then
    raise exception 'JOB_CANNOT_BE_COMPLETED';
  end if;
  if review_rating is not null and (review_rating < 1 or review_rating > 5) then
    raise exception 'INVALID_RATING';
  end if;

  update public.job_posts
  set status = 'COMPLETED', completed_at = now()
  where id = job_id returning * into target;

  if review_rating is not null then
    insert into public.reviews (job_post_id, reviewer_id, reviewed_id, rating, comment)
    values (target.id, actor_id, target.assigned_electrician_id, review_rating, nullif(trim(review_comment), ''))
    on conflict (job_post_id) do nothing;

    update public.electrician_profiles ep
    set rating_average = stats.average_rating,
        total_reviews = stats.review_count,
        completed_jobs_count = ep.completed_jobs_count + 1
    from (
      select reviewed_id, round(avg(rating)::numeric, 2) as average_rating, count(*)::integer as review_count
      from public.reviews where reviewed_id = target.assigned_electrician_id and is_visible = true
      group by reviewed_id
    ) stats
    where ep.user_id = stats.reviewed_id;
  else
    update public.electrician_profiles
    set completed_jobs_count = completed_jobs_count + 1
    where user_id = target.assigned_electrician_id;
  end if;

  insert into public.notifications (user_id, type, title, message, related_type, related_id)
  values (target.assigned_electrician_id, 'job_completed', 'İş Tamamlandı', 'İlan sahibi işi tamamlandı olarak onayladı.', 'JOB', target.id)
  returning * into notice;
  insert into public.notification_outbox (notification_id, user_id, event_type, payload)
  values (notice.id, target.assigned_electrician_id, 'job_completed', jsonb_build_object('jobId', target.id, 'type', 'job_completed'));
  return target;
end;
$$;

create or replace function public.create_job_review(job_id text, review_rating integer, review_comment text default null)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  target public.job_posts;
  result public.reviews;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if review_rating < 1 or review_rating > 5 then raise exception 'INVALID_RATING'; end if;
  select * into target from public.job_posts where id = job_id;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if target.citizen_id <> actor_id then raise exception 'JOB_OWNER_REQUIRED'; end if;
  if target.status <> 'COMPLETED'::public."JobStatus" or target.assigned_electrician_id is null then
    raise exception 'JOB_NOT_COMPLETED';
  end if;
  insert into public.reviews (job_post_id, reviewer_id, reviewed_id, rating, comment)
  values (target.id, actor_id, target.assigned_electrician_id, review_rating, nullif(trim(review_comment), ''))
  returning * into result;
  return result;
end;
$$;

revoke all on function public.cancel_job(text, text) from public;
revoke all on function public.delete_job(text) from public;
revoke all on function public.complete_job(text, integer, text) from public;
revoke all on function public.create_job_review(text, integer, text) from public;
grant execute on function public.cancel_job(text, text) to authenticated;
grant execute on function public.delete_job(text) to authenticated;
grant execute on function public.complete_job(text, integer, text) to authenticated;
grant execute on function public.create_job_review(text, integer, text) to authenticated;
