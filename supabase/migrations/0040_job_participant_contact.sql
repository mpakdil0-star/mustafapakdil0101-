-- Reveal contact details only after a bid has been accepted and only to the
-- citizen/electrician participating in that job. Public projections remain safe.
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
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into target_job
  from public.job_posts
  where id = p_job_id and deleted_at is null;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if target_job.assigned_electrician_id is null or target_job.accepted_bid_id is null then
    raise exception 'CONTACT_NOT_AVAILABLE';
  end if;

  if actor_id = target_job.citizen_id then
    contact_id := target_job.assigned_electrician_id;
  elsif actor_id = target_job.assigned_electrician_id then
    contact_id := target_job.citizen_id;
  elsif public.is_admin() then
    contact_id := target_job.assigned_electrician_id;
  else
    raise exception 'FORBIDDEN';
  end if;

  select * into contact
  from public.users
  where id = contact_id and deleted_at is null;

  if not found then
    raise exception 'CONTACT_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'userId', contact.id,
    'fullName', contact.full_name,
    'phone', contact.phone
  );
end;
$$;

revoke all on function public.get_job_participant_contact(text) from public, anon;
grant execute on function public.get_job_participant_contact(text) to authenticated;
