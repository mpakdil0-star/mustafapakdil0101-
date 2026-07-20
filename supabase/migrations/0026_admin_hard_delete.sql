create extension if not exists pgcrypto with schema extensions;

-- A one-way identity hash prevents a deleted Google/email account from being
-- silently recreated on the next social sign-in without retaining its PII.
create table if not exists public.deleted_user_identities (
  identity_hash text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by text not null
);

alter table public.deleted_user_identities enable row level security;
revoke all on table public.deleted_user_identities from public, anon, authenticated;

create or replace function public.prevent_deleted_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_hash text;
begin
  if new.email is null then return new; end if;
  email_hash := encode(extensions.digest(lower(trim(new.email)), 'sha256'), 'hex');
  if exists (
    select 1 from public.deleted_user_identities d
    where d.identity_hash = email_hash
  ) then
    raise exception 'ACCOUNT_PERMANENTLY_DELETED';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_deleted_auth_identity on auth.users;
create trigger prevent_deleted_auth_identity
before insert or update of email on auth.users
for each row execute function public.prevent_deleted_auth_identity();

-- Hard deletion is intentional for the admin workflow. Convert every public
-- foreign key that references users to cascade, including future schema names
-- already present in production.
do $$
declare
  fk record;
  definition text;
begin
  for fk in
    select c.oid, c.conname, c.conrelid
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.users'::regclass
      and c.confdeltype <> 'c'
  loop
    definition := pg_get_constraintdef(fk.oid);
    definition := regexp_replace(definition, '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', '', 'i');
    execute format(
      'alter table %s drop constraint %I, add constraint %I %s on delete cascade',
      fk.conrelid::regclass,
      fk.conname,
      fk.conname,
      definition
    );
  end loop;
end;
$$;
