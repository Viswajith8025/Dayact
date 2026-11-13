# Graph Report - Dayact  (2026-11-06)

## Corpus Check
- 90 files · ~40,253 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .toml 2, .mdc 1)

## Summary
- 539 nodes · 1272 edges · 27 communities (23 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80764675`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FollowupsPage.tsx
- package.json
- AppShell.tsx
- activities.ts
- compilerOptions
- compilerOptions
- ChallengesPage.tsx
- Dayact
- tsconfig.json
- steps
- ProfileSheet.tsx
- index.ts
- ThemeProvider.tsx
- Production launch checklist
- send-followup-reminders
- CHANGELOG
- dependencies
- AchievementsPage.tsx
- @playwright/test
- vite.config.ts
- scripts
- Dayact v2.2.0 — Grokbot full retest
- suggest-activity/index.ts
- generate-maskable-icon.mjs
- Button

## God Nodes (most connected - your core abstractions)
1. `TodayPage()` - 47 edges
2. `Button()` - 32 edges
3. `react` - 29 edges
4. `localDateString()` - 26 edges
5. `useAuth()` - 24 edges
6. `ProfileSheet()` - 23 edges
7. `FollowupsPage()` - 21 edges
8. `SheetPortal()` - 20 edges
9. `Dayact v2.2.0 — Grokbot full retest` - 19 edges
10. `AchievementsPage()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `pick()` --calls--> `localDateString()`  [EXTRACTED]
  src/components/DateCalendarSheet.tsx → src/lib/activities.ts
- `applyPlan()` --calls--> `create()`  [EXTRACTED]
  src/components/PlanWeekSheet.tsx → src/lib/activities.ts
- `AppRoutes()` --calls--> `AchievementsPage()`  [EXTRACTED]
  src/App.tsx → src/pages/AchievementsPage.tsx
- `AppRoutes()` --calls--> `FollowupsPage()`  [EXTRACTED]
  src/App.tsx → src/pages/FollowupsPage.tsx
- `AppShell()` --calls--> `AchievementCelebrations()`  [EXTRACTED]
  src/components/AppShell.tsx → src/components/AchievementCelebrations.tsx

## Import Cycles
- None detected.

## Communities (27 total, 4 thin omitted)

### Community 0 - "FollowupsPage.tsx"
Cohesion: 0.12
Nodes (20): FollowUpGroup, formatFollowUpRelative(), formatPlannedForSecondary(), userBadgeColor(), FollowUpTone, followUpTone(), followUpWittyLine(), hashSeed() (+12 more)

### Community 1 - "package.json"
Cohesion: 0.17
Nodes (15): devDependencies, @types/canvas-confetti@^1.9.0, @types/react@^19.0.8, @types/react-dom@^19.0.3, typescript@~5.7.2, @vitejs/plugin-react@^4.3.4, name, private (+7 more)

### Community 2 - "AppShell.tsx"
Cohesion: 0.08
Nodes (46): lucide-react, react, react-router-dom, App(), AppRoutes(), ChallengesPage, HeatmapPage, LazyFallback() (+38 more)

### Community 3 - "activities.ts"
Cohesion: 0.08
Nodes (52): DayProgressBar(), DayProgressProps, DuelStripProps, ProductivityDuelStrip(), MoodPrompt(), pick(), MoodPromptProps, MOODS (+44 more)

### Community 4 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 5 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 6 - "ChallengesPage.tsx"
Cohesion: 0.25
Nodes (17): getMyProfile(), localDateString(), cancelChallenge(), Challenge, ChallengeProgress, createChallenge(), decrementChallengeProgressForDone(), deleteChallenge() (+9 more)

### Community 7 - "Dayact"
Cohesion: 0.20
Nodes (9): Adding a user later, Automated tests (Playwright), CI (GitHub Actions), Dayact, Deploy (Netlify), License, Local setup, PWA icons (+1 more)

### Community 10 - "steps"
Cohesion: 0.10
Nodes (20): runs-on, steps, CI, DAYACT_TEST_EMAIL, DAYACT_TEST_PASSWORD, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL, jobs (+12 more)

### Community 11 - "ProfileSheet.tsx"
Cohesion: 0.12
Nodes (27): JointStreakCard(), load(), EMOJI_PRESETS, PROFILE_UPDATED_EVENT, ProfileSheet(), handleSave(), togglePush(), ProfileSheetProps (+19 more)

### Community 12 - "index.ts"
Cohesion: 0.09
Nodes (24): corsHeaders, ActivityRow, corsHeaders, SubscriptionRow, corsHeaders, handlePartnerReminder(), corsHeaders, LABELS (+16 more)

### Community 13 - "ThemeProvider.tsx"
Cohesion: 0.25
Nodes (14): options, ThemeToggle(), applyThemePreference(), defaultPreferenceForDevice(), getInitialPreference(), initTheme(), persistPreference(), readStoredPreference() (+6 more)

### Community 14 - "Production launch checklist"
Cohesion: 0.29
Nodes (6): Local automated tests, Netlify, Phones, Production launch checklist, Supabase (`aqchmwcycnoaylmqneca`), Verify (5 minutes)

### Community 15 - "send-followup-reminders"
Cohesion: 0.40
Nodes (4): Deploy, Schedule, Secrets (Edge Functions), send-followup-reminders

### Community 17 - "CHANGELOG"
Cohesion: 0.14
Nodes (13): CHANGELOG, Checklist, Dayact v2.1 build plan, Edge functions, Migrations (run in order on Supabase), v2.1.0, v2.1.1, v2.1.2 (+5 more)

### Community 18 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, canvas-confetti@^1.9.4, date-fns@^4.1.0, html-to-image@^1.11.13, lucide-react@^0.474.0, react@^19.0.0, react-dom@^19.0.0, react-router-dom@^7.1.5 (+7 more)

### Community 19 - "AchievementsPage.tsx"
Cohesion: 0.09
Nodes (41): date-fns, AchievementCelebrations(), MedalIcon(), ToastItem, WeeklyRecapCard(), downloadBlob(), shareCard(), WeeklyRecapCardProps (+33 more)

### Community 20 - "@playwright/test"
Cohesion: 0.36
Nodes (6): cleanupQaActivities(), clickMenuItem(), deleteActivityRow(), waitForActivityDelete(), @playwright/test@^1.64.1, @playwright/test

### Community 21 - "vite.config.ts"
Cohesion: 0.20
Nodes (7): @tailwindcss/vite@^4.0.6, vite@^6.1.0, vite-plugin-pwa@^2.0.0, @tailwindcss/vite, vite, vite-plugin-pwa, GEMINI_MODELS

### Community 22 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, icons:maskable, preview, test:e2e, test:e2e:ui

### Community 23 - "Dayact v2.2.0 — Grokbot full retest"
Cohesion: 0.10
Nodes (19): 10. Mood (v2.1.6), 11. Follow-ups and push (v2.0), 12. Achievements and PWA, 13. Infra (v2.2.0), 14. Cleanup, 15. Report template (Grokbot output), 1. Automated suite (run first), 2. Auth and shell (+11 more)

### Community 25 - "generate-maskable-icon.mjs"
Cohesion: 0.17
Nodes (6): sharp@^0.35.5, sharp, input, logoSize, output, root

### Community 26 - "Button"
Cohesion: 0.09
Nodes (34): ActivitySheet(), handleSuggest(), isDirty(), requestClose(), ActivitySheetMode, ActivitySheetProps, Button(), DateCalendarSheet() (+26 more)

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AppShell.tsx` to `FollowupsPage.tsx`, `package.json`, `activities.ts`, `ChallengesPage.tsx`, `ProfileSheet.tsx`, `ThemeProvider.tsx`, `dependencies`, `AchievementsPage.tsx`, `Button`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `FollowupsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Why does `date-fns` connect `AchievementsPage.tsx` to `package.json`, `AppShell.tsx`, `activities.ts`, `ChallengesPage.tsx`, `dependencies`, `Button`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `AppShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07834101382488479 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `package.json`, `generate-maskable-icon.mjs`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `activities.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08348457350272233 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._