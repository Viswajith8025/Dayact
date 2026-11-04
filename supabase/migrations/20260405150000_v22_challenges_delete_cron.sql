-- v2.2.1: delete cancelled challenges; cron schedule template (run after CRON_SECRET is in Vault)

create policy challenges_delete_own_cancelled
  on public.challenges
  for delete
  to authenticated
  using (created_by = auth.uid() and status = 'cancelled');

-- Hourly evening nudge + daily follow-up reminders (requires pg_cron + pg_net).
-- Replace YOUR_PROJECT_REF and ensure Vault secrets cron_secret + service_role_key exist,
-- or pass x-cron-secret from Dashboard cron HTTP job headers.
--
-- select cron.unschedule(jobid) from cron.job where jobname in ('dayact-evening-nudge','dayact-followup-reminders');
--
-- select cron.schedule(
--   'dayact-evening-nudge',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/evening-partner-nudge',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
--     ),
--     body := '{}'::jsonb
--   ) as request_id;
--   $$
-- );
