insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy community_media_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy community_media_owner_update on storage.objects for update to authenticated
using(bucket_id='community-media' and owner_id=auth.uid()::text)
with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy community_media_owner_delete on storage.objects for delete to authenticated
using(bucket_id='community-media' and (owner_id=auth.uid()::text or public.is_admin()));
create policy community_media_public_read on storage.objects for select to anon,authenticated
using(bucket_id='community-media');
