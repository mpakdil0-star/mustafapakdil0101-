-- Safe participant cards and Realtime configuration for messaging.

create or replace view public.user_cards
with (security_barrier = true)
as
select id, full_name, profile_image_url, user_type
from public.users
where is_active = true and is_banned = false and deleted_at is null;

revoke all on public.user_cards from public;
grant select on public.user_cards to authenticated;

alter table public.messages replica identity full;
alter table public.conversations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then alter publication supabase_realtime add table public.messages; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then alter publication supabase_realtime add table public.conversations; end if;
end;
$$;

revoke execute on function public.find_or_create_conversation(text, text) from anon;
revoke execute on function public.send_message(text, text, public."MessageType", text, text, integer) from anon;
revoke execute on function public.mark_conversation_read(text) from anon;
