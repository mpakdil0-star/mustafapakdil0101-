-- Row Level Security policies. Privileged workflows remain RPC/Edge-only.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users', 'legal_documents', 'user_consents', 'electrician_profiles',
    'job_posts', 'bids', 'conversations', 'messages', 'reviews', 'payments',
    'escrow_accounts', 'credits', 'notifications', 'locations',
    'support_tickets', 'support_ticket_messages', 'favorites', 'reports',
    'blocks', 'calendar_events', 'ledger_entries', 'marketplace_products',
    'showcase_items', 'forum_posts', 'forum_comments', 'job_sharing_posts',
    'push_tokens', 'notification_outbox'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.legal_documents, public.reviews,
  public.marketplace_products, public.showcase_items, public.forum_posts,
  public.forum_comments, public.job_sharing_posts to anon;

-- Users: full rows are private. Public discovery uses public_electricians.
create policy users_select_self_or_admin on public.users
for select to authenticated
using (id = auth.uid()::text or public.is_admin());

create policy users_update_self_or_admin on public.users
for update to authenticated
using (id = auth.uid()::text or public.is_admin())
with check (id = auth.uid()::text or public.is_admin());

-- Column grants prevent self-promotion and balance/ban manipulation via direct update.
revoke insert, delete on public.users from authenticated;
revoke update on public.users from authenticated;
grant update (
  full_name, phone, city, profile_image_url, last_seen_at,
  language_preference, notification_settings, accepted_legal_version,
  marketing_allowed
) on public.users to authenticated;

-- Legal content is public; consent history is append-only for its owner.
create policy legal_documents_public_read on public.legal_documents
for select to anon, authenticated
using ("isActive" = true or public.is_admin());

create policy user_consents_select_own on public.user_consents
for select to authenticated using (user_id = auth.uid()::text or public.is_admin());
create policy user_consents_insert_own on public.user_consents
for insert to authenticated with check (user_id = auth.uid()::text);

-- Electrician private profile. Public fields are exposed through the safe view.
create policy electrician_profiles_select_related on public.electrician_profiles
for select to authenticated
using (user_id = auth.uid()::text or public.is_admin());
create policy electrician_profiles_update_own on public.electrician_profiles
for update to authenticated
using (user_id = auth.uid()::text or public.is_admin())
with check (user_id = auth.uid()::text or public.is_admin());

revoke update on public.electrician_profiles from authenticated;
grant update (
  company_name, tax_number, bio, experience_years, license_number,
  emo_number, smm_number, service_areas, specialties, hourly_rate,
  minimum_charge, is_available, availability_hours, service_category
) on public.electrician_profiles to authenticated;

-- Jobs: owners and assigned electricians get full rows. Discovery uses safe view.
create policy jobs_select_related on public.job_posts
for select to authenticated
using (
  citizen_id = auth.uid()::text
  or assigned_electrician_id = auth.uid()::text
  or public.is_admin()
  or (
    status in ('OPEN'::public."JobStatus", 'BIDDING'::public."JobStatus")
    and deleted_at is null
  )
);
create policy jobs_insert_owner on public.job_posts
for insert to authenticated with check (citizen_id = auth.uid()::text);
create policy jobs_update_owner on public.job_posts
for update to authenticated
using (citizen_id = auth.uid()::text or public.is_admin())
with check (citizen_id = auth.uid()::text or public.is_admin());

-- Direct status/assignment manipulation is intentionally excluded.
revoke update on public.job_posts from authenticated;
grant update (
  title, description, category, subcategory, service_category, location,
  urgency_level, estimated_budget, budget_range, preferred_time, images,
  video_url, expires_at, updated_at
) on public.job_posts to authenticated;

-- Bids: bid owner and job owner can read; writes with financial effects use RPC.
create policy bids_select_related on public.bids
for select to authenticated
using (
  electrician_id = auth.uid()::text
  or public.is_admin()
  or exists (
    select 1 from public.job_posts j
    where j.id = bids.job_post_id and j.citizen_id = auth.uid()::text
  )
);

-- Conversations/messages.
create policy conversations_member_select on public.conversations
for select to authenticated
using (auth.uid()::text in (participant_1_id, participant_2_id) or public.is_admin());

create policy messages_member_select on public.messages
for select to authenticated
using (public.is_conversation_member(conversation_id) or public.is_admin());

-- Reviews are public when visible; creation and state changes use RPC.
create policy reviews_public_read on public.reviews
for select to anon, authenticated
using (is_visible = true or reviewer_id = auth.uid()::text or reviewed_id = auth.uid()::text or public.is_admin());

-- Financial tables are read-only to their parties; service role/RPC writes them.
create policy payments_party_read on public.payments
for select to authenticated
using (auth.uid()::text in (payer_id, payee_id) or public.is_admin());
create policy escrow_related_read on public.escrow_accounts
for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.job_posts j
    where j.id = escrow_accounts.job_post_id
      and auth.uid()::text in (j.citizen_id, j.assigned_electrician_id)
  )
);
create policy credits_owner_read on public.credits
for select to authenticated using (user_id = auth.uid()::text or public.is_admin());

-- Notifications and push devices.
create policy notifications_owner_select on public.notifications
for select to authenticated using (user_id = auth.uid()::text or public.is_admin());
create policy notifications_owner_update on public.notifications
for update to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);
create policy notifications_owner_delete on public.notifications
for delete to authenticated using (user_id = auth.uid()::text);

revoke update on public.notifications from authenticated;
grant update (is_read, read_at) on public.notifications to authenticated;

create policy push_tokens_owner_all on public.push_tokens
for all to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- Outbox is deliberately invisible to normal clients.

-- Locations.
create policy locations_owner_all on public.locations
for all to authenticated
using (user_id = auth.uid()::text or public.is_admin())
with check (user_id = auth.uid()::text or public.is_admin());

-- Support.
create policy support_tickets_owner_select on public.support_tickets
for select to authenticated using (user_id = auth.uid()::text or public.is_admin());
create policy support_tickets_owner_insert on public.support_tickets
for insert to authenticated with check (user_id = auth.uid()::text);
create policy support_messages_related_select on public.support_ticket_messages
for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()::text
  )
);
create policy support_messages_related_insert on public.support_ticket_messages
for insert to authenticated
with check (
  sender_id = auth.uid()::text
  and is_admin = false
  and exists (
    select 1 from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()::text
  )
);

-- Favorites and blocks.
create policy favorites_owner_all on public.favorites
for all to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);
create policy blocks_owner_all on public.blocks
for all to authenticated
using (blocker_id = auth.uid()::text)
with check (blocker_id = auth.uid()::text);

-- Reports.
create policy reports_owner_select on public.reports
for select to authenticated using (reporter_id = auth.uid()::text or public.is_admin());
create policy reports_owner_insert on public.reports
for insert to authenticated
with check (reporter_id = auth.uid()::text and reporter_id <> reported_id);

-- Personal tools.
create policy calendar_owner_all on public.calendar_events
for all to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);
create policy ledger_owner_all on public.ledger_entries
for all to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

-- Marketplace/community. Public reads, owner writes.
create policy marketplace_public_read on public.marketplace_products
for select to anon, authenticated using (true);
create policy marketplace_owner_insert on public.marketplace_products
for insert to authenticated with check (seller_id = auth.uid()::text);
create policy marketplace_owner_update on public.marketplace_products
for update to authenticated
using (seller_id = auth.uid()::text or public.is_admin())
with check (seller_id = auth.uid()::text or public.is_admin());
create policy marketplace_owner_delete on public.marketplace_products
for delete to authenticated using (seller_id = auth.uid()::text or public.is_admin());

create policy showcase_public_read on public.showcase_items
for select to anon, authenticated using (true);
create policy showcase_owner_insert on public.showcase_items
for insert to authenticated with check (usta_id = auth.uid()::text);
create policy showcase_owner_modify on public.showcase_items
for update to authenticated
using (usta_id = auth.uid()::text or public.is_admin())
with check (usta_id = auth.uid()::text or public.is_admin());
create policy showcase_owner_delete on public.showcase_items
for delete to authenticated using (usta_id = auth.uid()::text or public.is_admin());

create policy forum_posts_public_read on public.forum_posts
for select to anon, authenticated using (true);
create policy forum_posts_owner_insert on public.forum_posts
for insert to authenticated with check (usta_id = auth.uid()::text);
create policy forum_posts_owner_modify on public.forum_posts
for update to authenticated
using (usta_id = auth.uid()::text or public.is_admin())
with check (usta_id = auth.uid()::text or public.is_admin());
create policy forum_posts_owner_delete on public.forum_posts
for delete to authenticated using (usta_id = auth.uid()::text or public.is_admin());

create policy forum_comments_public_read on public.forum_comments
for select to anon, authenticated using (true);
create policy forum_comments_owner_insert on public.forum_comments
for insert to authenticated with check (usta_id = auth.uid()::text);
create policy forum_comments_owner_delete on public.forum_comments
for delete to authenticated using (usta_id = auth.uid()::text or public.is_admin());

create policy job_sharing_public_read on public.job_sharing_posts
for select to anon, authenticated using (true);
create policy job_sharing_owner_insert on public.job_sharing_posts
for insert to authenticated with check (usta_id = auth.uid()::text);
create policy job_sharing_owner_modify on public.job_sharing_posts
for update to authenticated
using (usta_id = auth.uid()::text or public.is_admin())
with check (usta_id = auth.uid()::text or public.is_admin());
create policy job_sharing_owner_delete on public.job_sharing_posts
for delete to authenticated using (usta_id = auth.uid()::text or public.is_admin());
