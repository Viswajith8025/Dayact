-- v2.2.2: allow deleting completed challenges; schedule edge crons (needs Vault secret cron_secret)

drop policy if exists challenges_delete_own_cancelled on public.challenges;

create policy challenges_delete_own_finished
  on public.challenges
  for delete
  to authenticated
  using (created_by = auth.uid() and status in ('cancelled', 'completed'));

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $cron$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if v_secret is null or length(trim(v_secret)) = 0 then
    raise notice 'Skipping cron schedules: add Vault secret cron_secret matching CRON_SECRET edge env.';
    return;
  end if;

  if not exists (select 1 from cron.job where jobname = 'dayact-evening-nudge') then
    perform cron.schedule(
      'dayact-evening-nudge',
      '0 * * * *',
      format(
        $job$
        select net.http_post(
          url := 'https://aqchmwcycnoaylmqneca.supabase.co/functions/v1/evening-partner-nudge',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := '{}'::jsonb
        ) as request_id;
        $job$,
        v_secret
      )
    );
  end if;

  if not exists (select 1 from cron.job where jobname = 'dayact-followup-reminders') then
    perform cron.schedule(
      'dayact-followup-reminders',
      '0 7 * * *',
      format(
        $job$
        select net.http_post(
          url := 'https://aqchmwcycnoaylmqneca.supabase.co/functions/v1/send-followup-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := '{}'::jsonb
        ) as request_id;
        $job$,
        v_secret
      )
    );
  end if;
end;
$cron$;
