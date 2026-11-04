# Dayact v2.2.0 — Grokbot full retest

Copy the **Agent prompt** below into Grok (or any QA agent). The rest of this file is the authoritative test plan.

---

## Agent prompt (copy from here)

```text
You are Grokbot, QA agent for Dayact (couple shared planner PWA, v2.2.0).

Read and follow every section in the repo file GROKBOT_RETEST.md (same directory as PLAN.md). Do not skip cleanup or the report template.

Targets:
- Primary: https://dayact-tracker.netlify.app
- Optional local: http://127.0.0.1:5199 after `npm run dev`

Rules:
- Prefix all test activity titles with [QA] and delete them when done (wait for DELETE on activity rows).
- Use two Supabase accounts when a step says "needs partner"; mark those steps SKIP with reason if you only have one account.
- Report PASS / FAIL / SKIP per section using the template at the end of GROKBOT_RETEST.md.
- Run automated tests first if you have shell access: `npm run build`, then `npm run test:e2e -- --workers=1`, then `--project=mobile`.
- For portaled menus (⋮ Activity actions), click menu items via visible menu role; confirm delete with alertdialog.
- Do not commit secrets; use .env for DAYACT_TEST_EMAIL / DAYACT_TEST_PASSWORD locally only.

Deliverable: completed report template filled in, plus list of blockers and recommended fixes.
```

---

## Preconditions

| Item | Required for |
|------|----------------|
| `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DAYACT_TEST_EMAIL`, `DAYACT_TEST_PASSWORD` | Local Playwright signed-in tests |
| Netlify env: `VITE_VAPID_PUBLIC_KEY` | Browser push subscribe |
| Supabase Edge secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_MAILTO` | Outbound push |
| Supabase: `GEMINI_API_KEY` | Suggest titles + Plan my week |
| Supabase: `CRON_SECRET` + schedules on `send-followup-reminders` (daily), `evening-partner-nudge` (hourly) | Scheduled nudges |
| Two auth users on Supabase project `aqchmwcycnoaylmqneca` | Partner streak, reactions, duel |
| Desktop Chrome + viewport **390×844** | Layout / mobile project |

**Version:** menu/footer must show **v2.2.0** on production.

**CSP (production HEAD):** `default-src 'self'`; `connect-src` includes `https://*.supabase.co` and `wss://*.supabase.co`; no Gemini in browser `connect-src`.

**Pair model:** exactly two dashboard users; `partner_id()` is the other profile.

---

## 1. Automated suite (run first)

From repository root:

```bash
npm run build
npm run test:e2e -- --workers=1
npm run test:e2e -- --workers=1 --project=mobile
```

**Expected:** all tests pass when `DAYACT_*` creds are set. Signed-in suite skips without them.

| Playwright test | Covers |
|-----------------|--------|
| smoke: login loads | Public shell |
| smoke: `/today` → login | Auth gate |
| today page and navigation | Today → Follow-ups → Achievements |
| add sheet validates empty title | Activity sheet validation |
| dirty draft discard dialog | Escape + Keep editing |
| productivity + Joint streak region | v2.1.0 UI |
| activity row menu Edit + delete | CRUD + cleanup |
| delete confirmation Escape | Alertdialog dismiss |
| lazy routes load | `/recap`, `/heatmap`, `/challenges` |
| weekly recap flag on today | `/today?recap=1` |

On failure: attach trace/screenshot from `test-results/`.

---

## 2. Auth and shell

| ID | Steps | Pass criteria |
|----|--------|----------------|
| A1 | Open `/login` logged out | Email, password, Sign in visible |
| A2 | Wrong password | Error; remain on login |
| A3 | Valid sign-in | URL `/today`; heading **Today** |
| A4 | Visit `/today` logged out | Redirect to `/login` |
| A5 | Open menu/footer | **v2.2.0**, Profile, Challenges, Heatmap, Weekly recap, theme, sign out |
| A6 | Cycle theme light / dark / system | Readable; no broken layout |
| A7 | Width 390px | Nav and sheets usable |

---

## 3. Today — core (v2.0+)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| T1 | Add `[QA] core-{timestamp}` | Row appears after save |
| T2 | Mark own row done | Done state; **You productivity** updates |
| T3 | Partial / in progress (row menu if shown) | Partial styling; not full done |
| T4 | Reschedule with reason | New date; reason persisted where UI shows it |
| T5 | ⋮ → Edit | Sheet saves |
| T6 | ⋮ → Delete → confirm | Row removed after DELETE |
| T7 | Date navigation + `?date=YYYY-MM-DD` | List matches date |
| T8 | Productivity duel strip | Visible when signed in |
| T9 | DevTools console on load + CRUD | No uncaught errors |

---

## 4. Joint streak (v2.1.0)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| S1 | Single user | Region **Joint streak** visible (0 allowed) |
| S2 | **Two users:** both ≥1 done today | Current streak ≥ 1 after refresh |
| S3 | Profile | Timezone sync; no error toast |
| S4 | Evening nudge | Optional: only at partner-done / you-not / local 21:00 + cron; else SKIP |

---

## 5. Reactions (v2.1.1) — needs partner

| ID | Steps | Pass criteria |
|----|--------|----------------|
| R1 | Partner has done activity visible on your Today | Shared read works |
| R2 | Partner done row | Four cheer buttons |
| R3 | Tap cheer | Persists; Realtime on second session if available |
| R4 | Push to activity owner | Optional if VAPID + subscribed |

---

## 6. Weekly recap (v2.1.2)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| W1 | `/today?recap=1` | Region **Weekly recap** |
| W2 | `/recap?recap=1` | H1 **Recap** + card |
| W3 | Share or download PNG | Non-empty image or share sheet |
| W4 | Sunday local | Card on Today without flag (or document SKIP) |

---

## 7. Couple challenges (v2.1.3)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| C1 | `/challenges` | Form + list |
| C2 | Create `[QA] challenge-{ts}`, target 1, 7 days | Side-by-side progress |
| C3 | Done count hits target | **completed**; confetti once (not every load) |
| C4 | Cleanup | Cancel or leave clearly tagged `[QA]` |

---

## 8. Heatmap (v2.1.4)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| H1 | `/heatmap` | **Activity heatmap**; You / Partner tabs |
| H2 | Grid | ~12 weeks; theme-aware colors |
| H3 | Tap cell | `/today?date=YYYY-MM-DD` |

---

## 9. AI (v2.1.5)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| G1 | Add activity → **Suggest titles** | Suggestions or friendly error |
| G2 | **Plan my week** on Today | Plan sheet; result or friendly error |
| G3 | Network tab | No browser calls to `generativelanguage.googleapis.com` on production |

---

## 10. Mood (v2.1.6)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| M1 | Mark done | Optional 1–5 mood strip; skippable |
| M2 | Select mood | Saves |
| M3 | Achievements → You | **Mood insights** when ≥2 samples per title |

---

## 11. Follow-ups and push (v2.0)

| ID | Steps | Pass criteria |
|----|--------|----------------|
| F1 | Activity with follow-up | Listed on **Follow-ups** |
| F2 | Reschedule follow-up + reason | Updates |
| F3 | Profile → **Enable reminders** | Subscribes when VAPID + permission granted |
| F4 | Turn off reminders | Unsubscribes |
| F5 | Denied notification permission | Clear message; no crash |

---

## 12. Achievements and PWA

| ID | Steps | Pass criteria |
|----|--------|----------------|
| P1 | Achievements | Catalog loads |
| P2 | This week duel | Scores for you vs teammate |
| P3 | Install / Add to Home Screen | Standalone launch |
| P4 | `/sw.js` | 200; refresh after deploy if stale |

---

## 13. Infra (v2.2.0)

| ID | Check | Pass |
|----|--------|------|
| I1 | Profile RLS | Only self + partner profile readable |
| I2 | Sign-up disabled | Unchanged policy |
| I3 | Code splitting | Separate chunks for Today, Challenges, Heatmap, Recap |
| I4 | CI | GitHub secrets documented for full e2e |

---

## 14. Cleanup

1. Delete every activity titled `[QA]…` (wait for DELETE each time).
2. Cancel active `[QA]` challenges if the UI allows.
3. Sign out all test sessions.

---

## 15. Report template (Grokbot output)

```markdown
## Dayact retest — {date}
**Target:** production | local  
**Version seen:**  
**Automated:** build {pass/fail} | e2e chromium {n}/{n} | mobile {n}/{n}

### Blockers
-

### Section results
| Section | Result | Notes |
|---------|--------|-------|
| Auth and shell | PASS/FAIL/SKIP | |
| Today core | | |
| Joint streak | | |
| Reactions | | |
| Weekly recap | | |
| Challenges | | |
| Heatmap | | |
| AI | | |
| Mood | | |
| Follow-ups and push | | |
| Achievements and PWA | | |
| Infra | | |

### Console / network issues
-

### Recommended fixes
-
```

---

## Execution order

1. §1 Automated  
2. §2–12 Manual (desktop + 390×844)  
3. §14 Cleanup  
4. §15 Report  

**Often SKIP (not FAIL):** single-user partner tests, evening nudge without cron/time, push without permission/VAPID.
