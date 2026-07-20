-- Storage buckets and object-level policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('job-images', 'job-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('message-attachments', 'message-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('verification-documents', 'verification-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('support-attachments', 'support-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Avatar and job paths start with the authenticated user's UUID.
create policy avatars_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and owner_id = auth.uid()::text);
create policy avatars_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'avatars');

create policy job_images_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy job_images_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'job-images' and owner_id = auth.uid()::text)
with check (bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy job_images_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'job-images' and owner_id = auth.uid()::text);
create policy job_images_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'job-images');

-- Verification documents always live under verification-documents/{uid}/...
create policy verification_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy verification_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'verification-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
create policy verification_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- Support files use support-attachments/{uid}/...
create policy support_attachment_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy support_attachment_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'support-attachments'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- Message files use message-attachments/{conversationId}/... and require membership.
create policy message_attachment_member_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and public.is_conversation_member((storage.foldername(name))[1])
);
create policy message_attachment_member_read on storage.objects
for select to authenticated
using (
  bucket_id = 'message-attachments'
  and (public.is_conversation_member((storage.foldername(name))[1]) or public.is_admin())
);
create policy message_attachment_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'message-attachments' and owner_id = auth.uid()::text);
