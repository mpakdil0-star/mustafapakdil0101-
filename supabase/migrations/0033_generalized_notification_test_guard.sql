-- All automated integration suites mark auth users with an automated_* app
-- metadata key. Keep those synthetic registrations out of the real admin inbox.
create or replace function public.notify_admins_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  if exists (
    select 1
    from jsonb_object_keys(coalesce(new.raw_app_meta_data, '{}'::jsonb)) as metadata_key
    where metadata_key like 'automated_%'
  ) then
    return new;
  end if;

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
