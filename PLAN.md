# Dayact v2.1 build plan

Pair model: exactly **two** Supabase auth users. `partner_id()` returns the other profile id.

## Checklist

- [x] PLAN.md + CHANGELOG scaffold
- [x] **v2.1.0** Shared streaks + evening partner push nudges
- [x] **v2.1.1** Reactions + Realtime + push
- [x] **v2.1.2** Weekly recap card
- [x] **v2.1.3** Couple challenges
- [x] **v2.1.4** Calendar heatmap
- [x] **v2.1.5** AI Plan my week + suggest titles
- [x] **v2.1.6** Mood check-in
- [x] **v2.2.0** Infra (CSP, icon, profiles RLS, CI, lazy routes)

## Migrations (run in order on Supabase)

1. `20260405100000_v21_profiles_timezone_streaks.sql`
2. `20260405110000_v21_reactions.sql`
3. `20260405120000_v21_challenges.sql`
4. `20260405130000_v21_mood.sql`
5. `20260405140000_v21_profiles_rls_pair.sql` (v2.2.0)

## Edge functions

| Function | Schedule | Secrets |
|----------|----------|---------|
| `send-followup-reminders` | daily (existing) | VAPID_*, CRON_SECRET |
| `evening-partner-nudge` | **hourly** | VAPID_*, CRON_SECRET, service role |
| `send-reaction-push` | on invoke | VAPID_* |
| `suggest-activity` | on invoke | GEMINI_API_KEY |

## CHANGELOG

### v2.1.0

- Joint streak card on Today; timezone on profile; evening partner nudge edge function.

### v2.1.1

- Cheer reactions on partner done activities; Realtime; reaction push.

### v2.1.2

- Sunday weekly recap; share/download PNG.

### v2.1.3

- Couple challenges with progress bars and confetti.

### v2.1.4

- 12-week activity heatmap (lazy route).

### v2.1.5

- Gemini suggest titles + Plan my week mode.

### v2.1.6

- Optional mood after done; insights.

### v2.2.0

- CSP, maskable icon, pair-scoped profile RLS, CI e2e secrets, lazy routes.
