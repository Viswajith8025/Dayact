# Dayact

Dayact is a installable PWA for two people who share one activity list: plan and complete daily work, schedule follow-ups, and see each other’s progress and achievements. There is no in-app sign-up screen; accounts are created in Supabase.

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the project **anon / publishable** key (never the service role key)
   - `VITE_VAPID_PUBLIC_KEY` — optional; Web Push follow-up reminders (see checklist)

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open the URL Vite prints (usually `http://localhost:5173`). You must sign in with a user that already exists in Supabase Auth.

## Deploy (Netlify)

The repo includes `netlify.toml`:

- **Build:** `npm run build`
- **Publish:** `dist`
- SPA fallback and security headers (including `Cache-Control: no-cache` on `/sw.js` for PWA updates)

In the Netlify site **Environment variables**, set only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY` (optional; enables Profile → Enable reminders)

Connect the GitHub repo (or run `netlify deploy --prod` with the CLI). After deploy, complete the Supabase steps below.

## CI (GitHub Actions)

The workflow in `.github/workflows/ci.yml` runs `npm run build` and Playwright. For **full** signed-in e2e in CI, add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Same as production/local |
| `VITE_SUPABASE_ANON_KEY` | Anon key only |
| `DAYACT_TEST_EMAIL` | E2e dashboard user |
| `DAYACT_TEST_PASSWORD` | That user’s password |

Without `DAYACT_*`, CI still runs smoke tests; signed-in tests skip.

## PWA icons

Regenerate the maskable icon (80% safe-zone padding) after changing `public/icons/icon-512.png`:

```bash
npm run icons:maskable
```

## Supabase (required for production)

1. **Authentication → Providers:** turn **Allow new users to sign up** **OFF**. The app has no sign-up UI, but the public anon key can still hit the sign-up API; with shared-read RLS, any new account could read all data.

2. **Authentication → URL Configuration:** set **Site URL** to your production URL (e.g. `https://your-site.netlify.app`).

3. **Authentication → Users:** create exactly the two real accounts your team will use (email + password). There is no self-service registration in the app.

Optional: run `supabase/migrations/*.sql` on your project if you are not already on the remote schema from development.

## Automated tests (Playwright)

```bash
npm run test:e2e
```

- Starts Vite on port **5199** (or reuses a dev server when not in CI).
- **Always runs:** login smoke + redirect tests (no credentials).
- **Signed-in tests:** set `DAYACT_TEST_EMAIL` and `DAYACT_TEST_PASSWORD` in `.env` to a real dashboard user.

Report: `npx playwright show-report` after a run.

## Adding a user later

Use **Supabase Dashboard → Authentication → Users → Add user** (email and password). Do not re-enable public sign-up. New users get a `profiles` row via the `handle_new_user` trigger.

## License

Private / team use unless otherwise noted.
