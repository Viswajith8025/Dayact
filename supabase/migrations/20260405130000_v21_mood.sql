-- v2.1.6 mood check-in

alter table public.activities
  add column if not exists mood smallint;

alter table public.activities drop constraint if exists activities_mood_check;

alter table public.activities
  add constraint activities_mood_check
  check (mood is null or (mood >= 1 and mood <= 5));
