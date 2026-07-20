-- Persist Google Play purchase verification attempts so paid transactions are
-- recoverable across app restarts and server/network failures.

create table if not exists public.google_play_purchases (
  purchase_token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  product_id text not null,
  package_name text not null default 'com.isbitir.app',
  order_id text,
  status text not null default 'RECEIVED'
    check (status in (
      'RECEIVED', 'VERIFYING', 'PENDING', 'VERIFIED', 'GRANTED',
      'GRANTED_PENDING_CONSUME', 'CONSUMED', 'CANCELED', 'FAILED_RETRYABLE', 'FAILED_FINAL'
    )),
  google_purchase_state integer,
  google_consumption_state integer,
  verification_attempts integer not null default 0,
  last_error_code text,
  last_error_message text,
  verified_at timestamptz,
  granted_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_play_purchases_user_created_idx
on public.google_play_purchases (user_id, created_at desc);

drop trigger if exists set_google_play_purchases_updated_at on public.google_play_purchases;
create trigger set_google_play_purchases_updated_at
before insert or update on public.google_play_purchases
for each row execute function public.set_updated_at();

alter table public.google_play_purchases enable row level security;
drop policy if exists google_play_purchases_select_own on public.google_play_purchases;
create policy google_play_purchases_select_own
on public.google_play_purchases
for select to authenticated
using (user_id = auth.uid()::text or public.is_admin());

revoke all on public.google_play_purchases from public, anon, authenticated;
grant select on public.google_play_purchases to authenticated;
grant all on public.google_play_purchases to service_role;

create or replace function public.grant_verified_purchase(
  p_user_id text,
  p_product_id text,
  p_purchase_token text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credits integer;
  v_name text;
  v_balance numeric(10,2);
  v_purchase public.google_play_purchases;
begin
  if p_product_id = 'pkg_10' then v_credits := 10; v_name := 'Hızlı Başlangıç';
  elsif p_product_id = 'pkg_35' then v_credits := 35; v_name := 'Gelişim Paketi';
  elsif p_product_id = 'pkg_75' then v_credits := 75; v_name := 'Eko-Avantaj';
  elsif p_product_id = 'pkg_175' then v_credits := 175; v_name := 'Usta Paketi';
  else raise exception 'INVALID_PRODUCT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_purchase_token, 0));

  select * into v_purchase
  from public.google_play_purchases
  where purchase_token = p_purchase_token
  for update;

  if not found then raise exception 'PURCHASE_VERIFICATION_RECORD_REQUIRED'; end if;
  if v_purchase.user_id <> p_user_id then raise exception 'PURCHASE_OWNER_MISMATCH'; end if;
  if v_purchase.product_id <> p_product_id then raise exception 'PURCHASE_PRODUCT_MISMATCH'; end if;
  if v_purchase.status not in ('VERIFIED', 'GRANTED', 'GRANTED_PENDING_CONSUME', 'CONSUMED') then
    raise exception 'PURCHASE_NOT_VERIFIED';
  end if;

  if exists (
    select 1 from public.credits
    where related_id = p_purchase_token and transaction_type = 'PURCHASE'
  ) then
    select credit_balance into v_balance
    from public.electrician_profiles
    where user_id = p_user_id;

    update public.google_play_purchases
    set status = case when status = 'CONSUMED' then status else 'GRANTED' end,
        granted_at = coalesce(granted_at, now()),
        last_error_code = null,
        last_error_message = null
    where purchase_token = p_purchase_token;

    return jsonb_build_object(
      'alreadyProcessed', true,
      'creditsAdded', 0,
      'newBalance', coalesce(v_balance, 0)
    );
  end if;

  update public.electrician_profiles
  set credit_balance = credit_balance + v_credits, updated_at = now()
  where user_id = p_user_id
  returning credit_balance into v_balance;
  if not found then raise exception 'ELECTRICIAN_PROFILE_REQUIRED'; end if;

  insert into public.credits (
    user_id, amount, transaction_type, related_id, description, balance_after
  ) values (
    p_user_id, v_credits, 'PURCHASE', p_purchase_token,
    v_credits || ' kredi satın alındı (' || v_name || ')', v_balance
  );

  update public.google_play_purchases
  set status = 'GRANTED',
      granted_at = now(),
      last_error_code = null,
      last_error_message = null
  where purchase_token = p_purchase_token;

  return jsonb_build_object(
    'alreadyProcessed', false,
    'creditsAdded', v_credits,
    'newBalance', v_balance
  );
end;
$$;

revoke all on function public.grant_verified_purchase(text, text, text) from public, anon, authenticated;
grant execute on function public.grant_verified_purchase(text, text, text) to service_role;
