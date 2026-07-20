create or replace function public.admin_set_user_active(p_user_id text, p_is_active boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_user_id=auth.uid()::text then raise exception 'CANNOT_CHANGE_SELF'; end if;
 update users set is_active=p_is_active, updated_at=now() where id=p_user_id and user_type<>'ADMIN'::public."UserType";
 if not found then raise exception 'USER_NOT_FOUND'; end if;
end $$;

create or replace function public.admin_soft_delete_user(p_user_id text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_user_id=auth.uid()::text then raise exception 'CANNOT_DELETE_SELF'; end if;
 update users set is_active=false, deleted_at=now(), updated_at=now() where id=p_user_id and user_type<>'ADMIN'::public."UserType";
 if not found then raise exception 'USER_NOT_FOUND'; end if;
end $$;

create or replace function public.admin_add_credit(p_user_id text,p_amount integer) returns numeric
language plpgsql security definer set search_path=public,pg_temp as $$
declare balance numeric(10,2);
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_amount<1 or p_amount>10000 then raise exception 'INVALID_AMOUNT'; end if;
 update electrician_profiles set credit_balance=credit_balance+p_amount,updated_at=now() where user_id=p_user_id returning credit_balance into balance;
 if not found then raise exception 'ELECTRICIAN_PROFILE_REQUIRED'; end if;
 insert into credits(user_id,amount,transaction_type,description,balance_after,related_id)
 values(p_user_id,p_amount,'BONUS','Yönetici tarafından kredi eklendi',balance,'admin:'||auth.uid()::text||':'||gen_random_uuid()::text);
 return balance;
end $$;

create or replace function public.admin_process_verification(p_user_id text,p_status text,p_reason text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor text:=auth.uid()::text; docs jsonb; was_verified boolean; balance numeric(10,2); is_engineer boolean;
begin
 if actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_status not in ('VERIFIED','REJECTED') then raise exception 'INVALID_STATUS'; end if;
 select verification_documents,verification_status='VERIFIED'::public."VerificationStatus" into docs,was_verified from electrician_profiles where user_id=p_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
 is_engineer:=coalesce(docs->>'documentType','')='YETKILI_MUHENDIS' and p_status='VERIFIED';
 update electrician_profiles set verification_status=p_status::public."VerificationStatus",license_verified=p_status='VERIFIED',is_authorized_engineer=is_engineer,
 verification_documents=coalesce(docs,'{}'::jsonb)||jsonb_build_object('reviewedAt',now(),'reviewedBy',actor,'rejectionReason',case when p_status='REJECTED' then p_reason else null end),updated_at=now()
 where user_id=p_user_id returning credit_balance into balance;
 update users set is_verified=p_status='VERIFIED',updated_at=now() where id=p_user_id;
 if p_status='VERIFIED' and not was_verified and not exists(select 1 from credits where related_id='verification:'||p_user_id) then
   balance:=balance+5; update electrician_profiles set credit_balance=balance where user_id=p_user_id;
   insert into credits(user_id,amount,transaction_type,description,balance_after,related_id) values(p_user_id,5,'BONUS','Belge doğrulama bonusu',balance,'verification:'||p_user_id);
 end if;
 insert into notifications(user_id,type,title,message,related_type,related_id)
 values(p_user_id,case when p_status='VERIFIED' then 'VERIFICATION_SUCCESS' else 'VERIFICATION_FAILED' end,
 case when p_status='VERIFIED' then 'Üyeliğiniz Onaylandı!' else 'Belge Onay Hatası' end,
 case when p_status='VERIFIED' then 'Belgeleriniz onaylandı. Onaylı Usta rozetiniz aktif.' else coalesce(nullif(trim(p_reason),''),'Belgeler uygun bulunmadı.') end,'USER_PROFILE',p_user_id);
end $$;

create or replace function public.admin_bulk_notify(p_user_ids text[],p_title text,p_body text) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare affected integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if length(trim(p_title))<1 or length(trim(p_body))<1 then raise exception 'CONTENT_REQUIRED'; end if;
 insert into notifications(user_id,type,title,message,related_type)
 select id,'ADMIN_ANNOUNCEMENT',trim(p_title),trim(p_body),'ADMIN' from users
 where is_active=true and deleted_at is null and (p_user_ids is null or id=any(p_user_ids));
 get diagnostics affected=row_count; return affected;
end $$;

revoke all on function public.admin_set_user_active(text,boolean),public.admin_soft_delete_user(text),public.admin_add_credit(text,integer),public.admin_process_verification(text,text,text),public.admin_bulk_notify(text[],text,text) from public,anon;
grant execute on function public.admin_set_user_active(text,boolean),public.admin_soft_delete_user(text),public.admin_add_credit(text,integer),public.admin_process_verification(text,text,text),public.admin_bulk_notify(text[],text,text) to authenticated;
