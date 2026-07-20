-- Keep the scheduled push processor environment-specific.

alter table public.push_runtime_config
add column if not exists function_url text;

update public.push_runtime_config
set function_url = coalesce(
  function_url,
  'https://htsdqvlyyiyawtmuhryi.supabase.co/functions/v1/process-push-outbox'
)
where id = 1;

alter table public.push_runtime_config
alter column function_url set not null;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'process-push-outbox';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'process-push-outbox',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (select function_url from public.push_runtime_config where id = 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select cron_secret::text from public.push_runtime_config where id = 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $cron$
);
