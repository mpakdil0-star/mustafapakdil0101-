-- Private electrician verification submission.

create or replace function public.submit_verification(
  document_type text,
  document_path text,
  license_number text default null,
  emo_number text default null,
  smm_number text default null
)
returns public.electrician_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
  result public.electrician_profiles;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if document_path is null or document_path = '' then raise exception 'DOCUMENT_REQUIRED'; end if;
  if split_part(document_path, '/', 1) <> actor_id then raise exception 'INVALID_DOCUMENT_PATH'; end if;

  update public.electrician_profiles
  set verification_status = 'PENDING',
      verification_documents = jsonb_build_object(
        'documentType', document_type,
        'path', document_path,
        'submittedAt', now()
      ),
      license_number = nullif(trim(license_number), ''),
      emo_number = nullif(trim(emo_number), ''),
      smm_number = nullif(trim(smm_number), ''),
      is_authorized_engineer = document_type = 'YETKILI_MUHENDIS'
  where user_id = actor_id
  returning * into result;

  if not found then raise exception 'ELECTRICIAN_PROFILE_NOT_FOUND'; end if;
  return result;
end;
$$;

revoke all on function public.submit_verification(text, text, text, text, text) from public;
grant execute on function public.submit_verification(text, text, text, text, text) to authenticated;
