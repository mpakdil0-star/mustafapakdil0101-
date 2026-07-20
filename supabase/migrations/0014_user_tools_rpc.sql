create or replace function public.complete_calendar_event(event_id text, add_to_ledger boolean default false)
returns public.calendar_events
language plpgsql security definer set search_path = ''
as $$
declare actor_id text := auth.uid()::text; result public.calendar_events;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.calendar_events set status = 'completed'
  where id = event_id and user_id = actor_id returning * into result;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if add_to_ledger and result.amount is not null then
    insert into public.ledger_entries (user_id, person_name, amount, type, status, note, due_date, calendar_event_id, event_time)
    values (actor_id, result.title, result.amount, 'receivable', case when result.is_paid then 'paid' else 'pending' end,
      result.note, result.event_date, result.id, result.event_time)
    on conflict do nothing;
  end if;
  return result;
end; $$;
revoke all on function public.complete_calendar_event(text, boolean) from public, anon;
grant execute on function public.complete_calendar_event(text, boolean) to authenticated;
