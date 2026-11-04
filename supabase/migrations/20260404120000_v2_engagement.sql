-- Dayact v2: partial progress, emoji profiles, push subscriptions

-- profiles.avatar_emoji
alter table public.profiles
  add column if not exists avatar_emoji text;

revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_emoji) on table public.profiles to authenticated;

-- activities v2 columns
alter table public.activities
  add column if not exists progress_pct smallint not null default 0,
  add column if not exists planned_time time,
  add column if not exists reschedule_reason text,
  add column if not exists continued_from_id uuid references public.activities (id) on delete set null;

alter table public.activities drop constraint if exists activities_status_check;

alter table public.activities
  add constraint activities_status_check
  check (status in ('planned', 'in_progress', 'done', 'skipped'));

alter table public.activities drop constraint if exists activities_progress_pct_check;

alter table public.activities
  add constraint activities_progress_pct_check
  check (progress_pct >= 0 and progress_pct <= 100);

create index if not exists activities_continued_from_idx
  on public.activities (continued_from_id, planned_for)
  where continued_from_id is not null;

-- push subscriptions (Web Push)
create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_update_own
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());
