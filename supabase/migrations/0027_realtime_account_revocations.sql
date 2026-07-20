-- Preserve a minimal, non-PII revocation event so an already-open client can
-- immediately discard its locally cached session after an admin hard delete.
create table if not exists public.account_revocations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  revoked_at timestamptz not null default now(),
  revoked_by text not null,
  reason text not null default 'ADMIN_DELETED'
);

create index if not exists account_revocations_user_id_revoked_at_idx
on public.account_revocations (user_id, revoked_at desc);

alter table public.account_revocations enable row level security;
alter table public.account_revocations force row level security;
alter table public.account_revocations replica identity full;

revoke all on table public.account_revocations from public, anon, authenticated;
grant select on table public.account_revocations to authenticated;

drop policy if exists account_revocations_select_own on public.account_revocations;
create policy account_revocations_select_own
on public.account_revocations
for select to authenticated
using (user_id = auth.uid()::text);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'account_revocations'
  ) then
    alter publication supabase_realtime add table public.account_revocations;
  end if;
end;
$$;
