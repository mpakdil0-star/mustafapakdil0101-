create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()::text
      and is_active = true
      and is_banned = false
      and deleted_at is null
  );
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

create table if not exists public.admin_impersonation_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null,
  target_user_id text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_impersonation_audit enable row level security;
revoke all on table public.admin_impersonation_audit from public, anon, authenticated;

-- Add a restrictive safety policy to every user-data table that already has
-- RLS. The profile and revocation tables remain readable so the client can
-- discover the suspension and clear its cached session immediately.
do $$
declare
  target record;
begin
  for target in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and rowsecurity = true
      and tablename not in (
        'users',
        'account_revocations',
        'legal_documents',
        'deleted_user_identities'
      )
  loop
    execute format('drop policy if exists active_account_required on %I.%I', target.schemaname, target.tablename);
    execute format(
      'create policy active_account_required on %I.%I as restrictive for all to authenticated using (public.is_active_user()) with check (public.is_active_user())',
      target.schemaname,
      target.tablename
    );
  end loop;
end;
$$;

create or replace function public.admin_set_user_active(p_user_id text, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_user_id = auth.uid()::text then
    raise exception 'CANNOT_CHANGE_SELF';
  end if;

  update public.users
  set is_active = p_is_active,
      updated_at = now()
  where id = p_user_id
    and user_type <> 'ADMIN'::public."UserType"
    and deleted_at is null;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if p_is_active then
    delete from public.account_revocations
    where user_id = p_user_id
      and reason = 'ADMIN_SUSPENDED';
  else
    update public.push_tokens
    set is_active = false,
        updated_at = now()
    where user_id = p_user_id
      and is_active = true;

    delete from public.account_revocations
    where user_id = p_user_id
      and reason = 'ADMIN_SUSPENDED';

    insert into public.account_revocations(user_id, revoked_by, reason)
    values (p_user_id, auth.uid()::text, 'ADMIN_SUSPENDED');
  end if;
end;
$$;

revoke all on function public.admin_set_user_active(text, boolean) from public, anon;
grant execute on function public.admin_set_user_active(text, boolean) to authenticated;
