-- Completes social-auth profiles after native Google/Apple ID-token sign-in.

create or replace function public.complete_auth_profile(
  requested_user_type public."UserType" default 'CITIZEN',
  requested_full_name text default null,
  requested_service_category text default null,
  requested_legal_version text default null,
  requested_marketing_allowed boolean default false
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  safe_type public."UserType";
  result public.users;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  safe_type := case
    when requested_user_type = 'ELECTRICIAN'::public."UserType"
      then 'ELECTRICIAN'::public."UserType"
    else 'CITIZEN'::public."UserType"
  end;

  -- Role selection is only open before the account has business activity.
  if exists (select 1 from public.job_posts where citizen_id = actor_id)
     or exists (select 1 from public.bids where electrician_id = actor_id) then
    select * into result from public.users where id = actor_id;
    return result;
  end if;

  update public.users
  set user_type = safe_type,
      full_name = coalesce(nullif(trim(requested_full_name), ''), full_name),
      accepted_legal_version = coalesce(nullif(requested_legal_version, ''), accepted_legal_version),
      marketing_allowed = coalesce(requested_marketing_allowed, marketing_allowed),
      last_login_at = now()
  where id = actor_id
  returning * into result;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if safe_type = 'ELECTRICIAN'::public."UserType" then
    insert into public.electrician_profiles (user_id, service_category)
    values (actor_id, coalesce(nullif(requested_service_category, ''), 'elektrik'))
    on conflict (user_id) do update set
      service_category = coalesce(nullif(requested_service_category, ''), public.electrician_profiles.service_category);
  end if;

  return result;
end;
$$;

revoke all on function public.complete_auth_profile(public."UserType", text, text, text, boolean) from public;
grant execute on function public.complete_auth_profile(public."UserType", text, text, text, boolean) to authenticated;
