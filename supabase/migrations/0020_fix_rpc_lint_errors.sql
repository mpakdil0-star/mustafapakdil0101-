-- Resolve PL/pgSQL parameter/column ambiguity in verification submissions.
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
      license_number = nullif(trim(submit_verification.license_number), ''),
      emo_number = nullif(trim(submit_verification.emo_number), ''),
      smm_number = nullif(trim(submit_verification.smm_number), ''),
      is_authorized_engineer = document_type = 'YETKILI_MUHENDIS'
  where user_id = actor_id
  returning * into result;

  if not found then raise exception 'ELECTRICIAN_PROFILE_NOT_FOUND'; end if;
  return result;
end;
$$;

-- Lock/validate the conversation without assigning an unused row variable.
create or replace function public.mark_conversation_read(conversation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text := auth.uid()::text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  perform 1
  from public.conversations
  where id = mark_conversation_read.conversation_id
    and actor_id in (participant_1_id, participant_2_id)
  for update;

  if not found then raise exception 'CONVERSATION_NOT_FOUND'; end if;

  update public.messages
  set is_read = true, read_at = now()
  where messages.conversation_id = mark_conversation_read.conversation_id
    and recipient_id = actor_id
    and is_read = false;

  update public.conversations
  set unread_count_participant_1 = case
        when participant_1_id = actor_id then 0
        else unread_count_participant_1
      end,
      unread_count_participant_2 = case
        when participant_2_id = actor_id then 0
        else unread_count_participant_2
      end
  where id = mark_conversation_read.conversation_id;
end;
$$;

revoke all on function public.submit_verification(text, text, text, text, text) from public;
revoke all on function public.mark_conversation_read(text) from public;
grant execute on function public.submit_verification(text, text, text, text, text) to authenticated;
grant execute on function public.mark_conversation_read(text) to authenticated;
