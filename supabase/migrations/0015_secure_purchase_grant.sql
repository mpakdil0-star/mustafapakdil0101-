-- Purchase credit grants are only callable by trusted server-side code.
create or replace function public.grant_verified_purchase(
  p_user_id text,
  p_product_id text,
  p_purchase_token text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_credits integer;
  v_name text;
  v_balance numeric(10,2);
begin
  if p_product_id = 'pkg_10' then v_credits := 10; v_name := 'Hızlı Başlangıç';
  elsif p_product_id = 'pkg_35' then v_credits := 35; v_name := 'Gelişim Paketi';
  elsif p_product_id = 'pkg_75' then v_credits := 75; v_name := 'Eko-Avantaj';
  elsif p_product_id = 'pkg_175' then v_credits := 175; v_name := 'Usta Paketi';
  else raise exception 'INVALID_PRODUCT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_purchase_token, 0));

  if exists (select 1 from public.credits where related_id = p_purchase_token) then
    select credit_balance into v_balance from public.electrician_profiles where user_id = p_user_id;
    return jsonb_build_object('alreadyProcessed', true, 'creditsAdded', 0, 'newBalance', coalesce(v_balance, 0));
  end if;

  update public.electrician_profiles
  set credit_balance = credit_balance + v_credits, updated_at = now()
  where user_id = p_user_id
  returning credit_balance into v_balance;
  if not found then raise exception 'ELECTRICIAN_PROFILE_REQUIRED'; end if;

  insert into public.credits (user_id, amount, transaction_type, related_id, description, balance_after)
  values (p_user_id, v_credits, 'PURCHASE', p_purchase_token,
    v_credits || ' kredi satın alındı (' || v_name || ')', v_balance);

  return jsonb_build_object('alreadyProcessed', false, 'creditsAdded', v_credits, 'newBalance', v_balance);
end;
$$;

revoke all on function public.grant_verified_purchase(text, text, text) from public, anon, authenticated;
grant execute on function public.grant_verified_purchase(text, text, text) to service_role;
