-- Supabase may grant function execution to API roles through default privileges.
-- Explicitly deny anonymous execution for every privileged workflow.

revoke execute on function public.create_bid(text, numeric, integer, timestamptz, text, jsonb) from anon;
revoke execute on function public.accept_bid(text) from anon;
revoke execute on function public.update_bid(text, numeric, integer, timestamptz, text, jsonb) from anon;
revoke execute on function public.reject_bid(text) from anon;
revoke execute on function public.withdraw_bid(text) from anon;
revoke execute on function public.delete_bid(text) from anon;
revoke execute on function public.request_bid_update(text) from anon;
revoke execute on function public.cancel_job(text, text) from anon;
revoke execute on function public.delete_job(text) from anon;
revoke execute on function public.complete_job(text, integer, text) from anon;
revoke execute on function public.create_job_review(text, integer, text) from anon;
revoke execute on function public.find_or_create_conversation(text, text) from anon;
revoke execute on function public.send_message(text, text, public."MessageType", text, text, integer) from anon;
revoke execute on function public.mark_conversation_read(text) from anon;
revoke execute on function public.complete_auth_profile(public."UserType", text, text, text, boolean) from anon;
revoke execute on function public.submit_verification(text, text, text, text, text) from anon;
