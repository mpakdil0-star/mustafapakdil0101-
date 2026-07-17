-- Complete the administrator workflows with server-side job search and an
-- immediate revocation event when a report results in an account ban.

create or replace function public.admin_list_jobs(
  p_search text default null,
  p_page integer default 1,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  search_term text := nullif(trim(coalesce(p_search, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  with filtered as materialized (
    select
      j.*,
      jsonb_build_object(
        'id', u.id,
        'fullName', u.full_name,
        'email', u.email,
        'phone', u.phone
      ) as citizen
    from public.job_posts j
    join public.users u on u.id = j.citizen_id
    where j.deleted_at is null
      and (
        search_term is null
        or j.title ilike '%' || search_term || '%'
        or j.description ilike '%' || search_term || '%'
        or j.category ilike '%' || search_term || '%'
        or coalesce(j.location ->> 'city', '') ilike '%' || search_term || '%'
        or coalesce(j.location ->> 'district', '') ilike '%' || search_term || '%'
        or u.full_name ilike '%' || search_term || '%'
        or coalesce(u.email, '') ilike '%' || search_term || '%'
        or coalesce(u.phone, '') ilike '%' || search_term || '%'
      )
  ),
  paged as (
    select *
    from filtered
    order by created_at desc
    limit safe_limit
    offset (safe_page - 1) * safe_limit
  )
  select jsonb_build_object(
    'jobs', coalesce((
      select jsonb_agg(
        to_jsonb(p) - 'citizen_id' || jsonb_build_object('citizen', p.citizen)
        order by p.created_at desc
      )
      from paged p
    ), '[]'::jsonb),
    'totalCount', (select count(*) from filtered),
    'totalPages', greatest(1, ceil((select count(*) from filtered)::numeric / safe_limit)::integer),
    'page', safe_page
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_list_jobs(text, integer, integer)
  from public, anon;
grant execute on function public.admin_list_jobs(text, integer, integer)
  to authenticated;

create or replace function public.admin_process_report(
  p_report_id text,
  p_status text,
  p_admin_notes text default null,
  p_ban_user boolean default false
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text := auth.uid()::text;
  target_user text;
  banned_user text;
begin
  if actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('PENDING','UNDER_REVIEW','RESOLVED','DISMISSED') then raise exception 'INVALID_STATUS'; end if;

  update public.reports
  set status = p_status::public."ReportStatus",
      admin_notes = nullif(trim(p_admin_notes), ''),
      resolved_at = case when p_status in ('RESOLVED','DISMISSED') then now() else null end,
      resolved_by = case when p_status in ('RESOLVED','DISMISSED') then actor else null end,
      updated_at = now()
  where id = p_report_id
  returning reported_id into target_user;

  if not found then raise exception 'REPORT_NOT_FOUND'; end if;

  if p_ban_user then
    update public.users
    set is_banned = true,
        is_active = false,
        ban_reason = coalesce(nullif(trim(p_admin_notes), ''), 'Yönetici şikâyet incelemesi'),
        updated_at = now()
    where id = target_user
      and user_type <> 'ADMIN'::public."UserType"
      and deleted_at is null
    returning id into banned_user;

    if banned_user is not null then
      update public.push_tokens
      set is_active = false,
          updated_at = now()
      where user_id = banned_user and is_active = true;

      delete from public.account_revocations
      where user_id = banned_user and reason = 'ADMIN_BANNED';

      insert into public.account_revocations(user_id, revoked_by, reason)
      values (banned_user, actor, 'ADMIN_BANNED');
    end if;
  end if;
end;
$$;

revoke all on function public.admin_process_report(text, text, text, boolean)
  from public, anon;
grant execute on function public.admin_process_report(text, text, text, boolean)
  to authenticated;
