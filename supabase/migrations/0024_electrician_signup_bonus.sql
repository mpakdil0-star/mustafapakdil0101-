-- Grant every newly registered electrician a one-time signup bonus.
-- The unique partial index makes the grant safe when the auth trigger runs
-- again after email confirmation or other auth-user updates.

create unique index if not exists credits_signup_bonus_user_idx
on public.credits (user_id)
where transaction_type = 'BONUS' and related_id = 'signup_bonus';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_type public."UserType";
  requested_name text;
  granted_credit_id text;
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
    coalesce(requested_name, split_part(coalesce(new.email, U&'Kullan\0131c\0131'), '@', 1)),
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

    insert into public.credits (
      user_id,
      amount,
      transaction_type,
      related_id,
      description,
      balance_after
    )
    select
      new.id::text,
      5,
      'BONUS',
      'signup_bonus',
      U&'Yeni usta kay\0131t bonusu',
      ep.credit_balance + 5
    from public.electrician_profiles ep
    where ep.user_id = new.id::text
    on conflict (user_id)
      where transaction_type = 'BONUS' and related_id = 'signup_bonus'
      do nothing
    returning id into granted_credit_id;

    if granted_credit_id is not null then
      update public.electrician_profiles
      set credit_balance = credit_balance + 5
      where user_id = new.id::text;
    end if;
  end if;

  return new;
end;
$$;

-- Repair electricians registered during the known broken production window.
-- A fixed timestamp keeps migration replay deterministic. Existing balances
-- and any account with credit history are deliberately left unchanged.
with eligible as (
  select ep.user_id
  from public.electrician_profiles ep
  join public.users u on u.id = ep.user_id
  where u.user_type = 'ELECTRICIAN'::public."UserType"
    and ep.created_at >= timestamp '2026-07-14 00:00:00'
    and ep.credit_balance = 0
    and not exists (
      select 1 from public.credits c where c.user_id = ep.user_id
    )
), granted as (
  insert into public.credits (
    user_id,
    amount,
    transaction_type,
    related_id,
    description,
    balance_after
  )
  select
    eligible.user_id,
    5,
    'BONUS',
    'signup_bonus',
    U&'Yeni usta kay\0131t bonusu',
    5
  from eligible
  on conflict (user_id)
    where transaction_type = 'BONUS' and related_id = 'signup_bonus'
    do nothing
  returning user_id
)
update public.electrician_profiles ep
set credit_balance = ep.credit_balance + 5
from granted
where ep.user_id = granted.user_id;
