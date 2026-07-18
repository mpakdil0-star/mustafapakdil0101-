-- Persistent, user-owned AI conversations and independently tracked issues.
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_role text not null default 'CITIZEN',
  title text,
  active_issue_id text,
  summary text,
  prompt_version text not null default 'v2-multi-issue',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  content text not null,
  has_image boolean not null default false,
  structured_output jsonb,
  is_fallback boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_issues (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_key text not null,
  category text not null,
  sub_category text,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  safety_action text,
  confidence numeric(4,3),
  status text not null default 'open' check (status in ('open', 'active', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, issue_key)
);

create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_issues_conversation_status_idx on public.ai_issues(conversation_id, status);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_issues enable row level security;

drop policy if exists "Users manage own AI conversations" on public.ai_conversations;
create policy "Users manage own AI conversations" on public.ai_conversations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own AI messages" on public.ai_messages;
create policy "Users manage own AI messages" on public.ai_messages
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own AI issues" on public.ai_issues;
create policy "Users manage own AI issues" on public.ai_issues
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_issues to authenticated;
