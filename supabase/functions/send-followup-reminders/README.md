# send-followup-reminders

Sends Web Push notifications for open follow-ups due today or overdue.

## Secrets (Edge Functions)

- `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `SUPABASE_URL` (auto)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_MAILTO` (optional, default `mailto:hello@dayact.app`)
- `CRON_SECRET` (optional; require `x-cron-secret` header when set)

## Deploy

```bash
supabase functions deploy send-followup-reminders --no-verify-jwt
```

When `CRON_SECRET` is set, only callers with header `x-cron-secret: <value>` can invoke the function.

## Schedule

In Supabase Dashboard → Edge Functions → send-followup-reminders → Schedules, run daily (e.g. `0 8 * * *` UTC).

Or invoke manually:

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/send-followup-reminders" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```
