-- Social sign-in creates an auth user before complete_auth_profile changes the
-- selected role to ELECTRICIAN. Grant the one-time bonus at that finalization
-- point as well as in the existing email-signup trigger.

create or replace function public.grant_electrician_signup_bonus(p_user_id text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted_credit_id text;
  resulting_balance numeric(10,2);
begin
  if p_user_id is null or trim(p_user_id) = '' then
    raise exception 'USER_ID_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('signup_bonus:' || p_user_id, 0));

  if not exists (
    select 1
    from public.users u
    join public.electrician_profiles ep on ep.user_id = u.id
    where u.id = p_user_id
      and u.user_type = 'ELECTRICIAN'::public."UserType"
      and u.deleted_at is null
  ) then
    raise exception 'ELECTRICIAN_PROFILE_REQUIRED';
  end if;

  insert into public.credits (
    user_id,
    amount,
    transaction_type,
    related_id,
    description,
    balance_after
  )
  select
    ep.user_id,
    5,
    'BONUS',
    'signup_bonus',
    U&'Yeni usta kay\0131t bonusu',
    ep.credit_balance + 5
  from public.electrician_profiles ep
  where ep.user_id = p_user_id
  on conflict (user_id)
    where transaction_type = 'BONUS' and related_id = 'signup_bonus'
    do nothing
  returning id into granted_credit_id;

  if granted_credit_id is not null then
    update public.electrician_profiles
    set credit_balance = credit_balance + 5,
        updated_at = now()
    where user_id = p_user_id
    returning credit_balance into resulting_balance;
  else
    select credit_balance into resulting_balance
    from public.electrician_profiles
    where user_id = p_user_id;
  end if;

  return coalesce(resulting_balance, 0);
end;
$$;

revoke all on function public.grant_electrician_signup_bonus(text) from public, anon, authenticated;
grant execute on function public.grant_electrician_signup_bonus(text) to service_role;

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
      service_category = coalesce(
        nullif(requested_service_category, ''),
        public.electrician_profiles.service_category
      );

    perform public.grant_electrician_signup_bonus(actor_id);
  end if;

  return result;
end;
$$;

revoke all on function public.complete_auth_profile(public."UserType", text, text, text, boolean) from public;
grant execute on function public.complete_auth_profile(public."UserType", text, text, text, boolean) to authenticated;

-- Repair accounts created since the Supabase cut-over that became electricians
-- through social profile completion and therefore missed the auth-insert bonus.
do $$
declare
  eligible record;
begin
  for eligible in
    select ep.user_id
    from public.electrician_profiles ep
    join public.users u on u.id = ep.user_id
    where u.user_type = 'ELECTRICIAN'::public."UserType"
      and u.deleted_at is null
      and ep.created_at >= timestamp '2026-07-14 00:00:00'
      and not exists (
        select 1
        from public.credits c
        where c.user_id = ep.user_id
          and c.transaction_type = 'BONUS'
          and c.related_id = 'signup_bonus'
      )
  loop
    perform public.grant_electrician_signup_bonus(eligible.user_id);
  end loop;
end;
$$;
