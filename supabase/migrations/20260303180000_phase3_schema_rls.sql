-- Phase 3: Dayact schema + RLS (four tables only)
--
-- ROLLBACK (run in reverse order if reverting):
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table if exists public.user_achievements;
-- drop table if exists public.activities;
-- drop table if exists public.achievements;
-- drop table if exists public.profiles;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  planned_for date not null,
  status text not null default 'planned',
  completed_at timestamptz,
  follow_up_on date,
  follow_up_done boolean not null default false,
  created_at timestamptz not null default now(),
  constraint activities_status_check check (status in ('planned', 'done', 'skipped'))
);

create index activities_user_id_planned_for_idx
  on public.activities (user_id, planned_for);

create index activities_planned_for_idx on public.activities (planned_for);

create index activities_followups_open_idx
  on public.activities (user_id, follow_up_on)
  where follow_up_on is not null and follow_up_done = false;

-- ---------------------------------------------------------------------------
-- achievements + user_achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  code text primary key,
  title text not null,
  description text not null,
  sort_order int not null
);

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null references public.achievements (code),
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- seed achievements (exactly six)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, sort_order)
values
  ('first_activity', 'First step', 'Log your first activity.', 1),
  ('ten_done', 'Ten done', 'Complete ten activities.', 2),
  ('fifty_done', 'Fifty done', 'Complete fifty activities.', 3),
  ('streak_3', '3-day streak', 'Stay active three days in a row.', 4),
  ('streak_7', '7-day streak', 'Stay active seven days in a row.', 5),
  ('perfect_day', 'Perfect day', 'Finish every planned item for a day.', 6);

-- ---------------------------------------------------------------------------
-- privileges: anon gets nothing; tighten authenticated writes
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from anon;
revoke all on table public.activities from anon;
revoke all on table public.achievements from anon;
revoke all on table public.user_achievements from anon;

revoke insert, update, delete on table public.achievements from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;

revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RLS (policies in same migration as enable)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- activities: shared read, own writes
create policy activities_select_authenticated
  on public.activities
  for select
  to authenticated
  using (auth.uid() is not null);

create policy activities_insert_own
  on public.activities
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy activities_update_own
  on public.activities
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy activities_delete_own
  on public.activities
  for delete
  to authenticated
  using (user_id = auth.uid());

-- profiles: shared read, own display_name update
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (auth.uid() is not null);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- achievements: read-only for clients
create policy achievements_select_authenticated
  on public.achievements
  for select
  to authenticated
  using (auth.uid() is not null);

-- user_achievements: shared read, no client writes (Phase 4 function)
create policy user_achievements_select_authenticated
  on public.user_achievements
  for select
  to authenticated
  using (auth.uid() is not null);
