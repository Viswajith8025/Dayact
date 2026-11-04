# Production launch checklist

Use this the night before or morning of go-live.

## Netlify

1. Connect repo `main` (already pushed).
2. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (Web Push; pair with Supabase `VAPID_PRIVATE_KEY` secret)
3. Deploy triggers on push; confirm latest deploy is **Published**.
4. **Site configuration → General → Netlify Badge → Hide badge** (the “Powered by Netlify” pill is injected by Netlify, not this repo).
5. Production URL: **`https://dayact-tracker.netlify.app`** (also **`https://dayact.netlify.app`** if both are connected).

## Supabase (`aqchmwcycnoaylmqneca`)

1. **Authentication → Providers:** sign-up **OFF**.
2. **Authentication → URL Configuration:** **Site URL** = your live Netlify URL (e.g. `https://dayact-tracker.netlify.app`). **Redirect URLs:** `https://dayact-tracker.netlify.app/**`, `https://dayact.netlify.app/**`, and `http://localhost:5173/**` for local dev.
3. **Authentication → Users:** two real accounts for you and your partner.
4. **Edge Functions → Secrets:** `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` (generate with `npx web-push generate-vapid-keys`). Optional `CRON_SECRET` for scheduled invokes. Deploy `send-followup-reminders` and schedule daily (see `supabase/functions/send-followup-reminders/README.md`).
5. Apply migrations including `*_v2_engagement.sql` on the project.
6. Optional: delete unused `GEMINI_API_KEY` secret if it was set for the old suggest feature.
7. Optional: run cleanup SQL in `supabase/scripts/cleanup-phase3-test-users.sql` if old test users remain.

## Verify (5 minutes)

```bash
curl -I https://YOUR-SITE.netlify.app/
curl -I https://YOUR-SITE.netlify.app/sw.js
```

Expect security headers from `netlify.toml`.

Anon signup must return **422 signup_disabled** (already configured if unchanged).

## Phones

1. Open production URL → Add to Home Screen.
2. Sign in both accounts; run through Today, follow-up, partner read-only view.
3. Menu shows app version (currently **v2.0.0**).

## Local automated tests

```bash
npm run test:e2e
```

Add `DAYACT_TEST_EMAIL` / `DAYACT_TEST_PASSWORD` to `.env` for full suite (signed-in flows).
