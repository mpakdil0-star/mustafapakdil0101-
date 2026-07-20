-- Participant directory is authenticated-only.
revoke all on public.user_cards from anon;
grant select on public.user_cards to authenticated;
