# Production launch checklist

Use this the night before or morning of go-live.

## Netlify

1. Connect repo `main` (already pushed).
2. Environment variables **only**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy triggers on push; confirm latest deploy is **Published**.
4. Note your URL, e.g. `https://your-site.netlify.app`.

## Supabase (`aqchmwcycnoaylmqneca`)

1. **Authentication → Providers:** sign-up **OFF**.
2. **Authentication → URL Configuration:** **Site URL** = Netlify URL.
3. **Authentication → Users:** two real accounts for you and your partner.
4. **Edge Functions → Secrets:** `GEMINI_API_KEY` (Google AI Studio, `AIza…`) for **Suggest titles** on production.
5. Optional: run cleanup SQL in `supabase/scripts/cleanup-phase3-test-users.sql` if old test users remain.

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
3. Menu shows app version (currently **v1.2.0**).

## Local automated tests

```bash
npm run test:e2e
```

Add `DAYACT_TEST_EMAIL` / `DAYACT_TEST_PASSWORD` to `.env` for full suite (signed-in flows).
