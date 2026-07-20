-- Clear the one-time migration marker after a user successfully changes the
-- imported password (including the password recovery flow).
create or replace function public.clear_password_reset_requirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password
     and coalesce((new.raw_app_meta_data ->> 'requires_password_reset')::boolean, false)
  then
    new.raw_app_meta_data = jsonb_set(
      coalesce(new.raw_app_meta_data, '{}'::jsonb),
      '{requires_password_reset}',
      'false'::jsonb,
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists clear_password_reset_requirement on auth.users;
create trigger clear_password_reset_requirement
before update of encrypted_password on auth.users
for each row execute function public.clear_password_reset_requirement();

revoke all on function public.clear_password_reset_requirement() from public, anon, authenticated;
