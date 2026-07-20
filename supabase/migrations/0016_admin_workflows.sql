create or replace function public.admin_manage_support_ticket(
  p_ticket_id text,
  p_status text default null,
  p_message text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare actor text := auth.uid()::text;
begin
  if actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status is not null then
    if p_status not in ('open','in_progress','resolved','closed') then raise exception 'INVALID_STATUS'; end if;
    update public.support_tickets set status = p_status,
      resolved_at = case when p_status in ('resolved','closed') then now() else null end,
      updated_at = now() where id = p_ticket_id;
    if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  elsif not exists (select 1 from public.support_tickets where id = p_ticket_id) then
    raise exception 'TICKET_NOT_FOUND';
  end if;
  if nullif(trim(p_message), '') is not null then
    insert into public.support_ticket_messages(ticket_id, sender_id, text, is_admin)
    values (p_ticket_id, actor, trim(p_message), true);
  end if;
end;
$$;

create or replace function public.admin_process_report(
  p_report_id text,
  p_status text,
  p_admin_notes text default null,
  p_ban_user boolean default false
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare actor text := auth.uid()::text; target_user text;
begin
  if actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('PENDING','UNDER_REVIEW','RESOLVED','DISMISSED') then raise exception 'INVALID_STATUS'; end if;
  update public.reports set status = p_status::public."ReportStatus", admin_notes = nullif(trim(p_admin_notes), ''),
    resolved_at = case when p_status in ('RESOLVED','DISMISSED') then now() else null end,
    resolved_by = case when p_status in ('RESOLVED','DISMISSED') then actor else null end,
    updated_at = now() where id = p_report_id returning reported_id into target_user;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  if p_ban_user then
    update public.users set is_banned = true, is_active = false,
      ban_reason = coalesce(nullif(trim(p_admin_notes), ''), 'Yönetici şikâyet incelemesi'), updated_at = now()
    where id = target_user and user_type <> 'ADMIN'::public."UserType";
  end if;
end;
$$;

create or replace function public.admin_delete_job(p_job_id text) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  update public.job_posts set deleted_at = now(), updated_at = now() where id = p_job_id and deleted_at is null;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.admin_manage_support_ticket(text,text,text) from public, anon;
revoke all on function public.admin_process_report(text,text,text,boolean) from public, anon;
revoke all on function public.admin_delete_job(text) from public, anon;
grant execute on function public.admin_manage_support_ticket(text,text,text) to authenticated;
grant execute on function public.admin_process_report(text,text,text,boolean) to authenticated;
grant execute on function public.admin_delete_job(text) to authenticated;
