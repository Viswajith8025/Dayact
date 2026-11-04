-- v2.3.0: partner nickname + one remind push per activity per sender per day

alter table public.profiles
  add column if not exists partner_nickname text;

revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_emoji, timezone, partner_nickname) on table public.profiles to authenticated;

create table if not exists public.partner_reminders (
  activity_id uuid not null references public.activities(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  sent_on date not null default (timezone('UTC', now()))::date,
  primary key (activity_id, from_user_id, sent_on)
);

alter table public.partner_reminders enable row level security;

create policy partner_reminders_select_own on public.partner_reminders
  for select to authenticated
  using (from_user_id = auth.uid());

create policy partner_reminders_insert_own on public.partner_reminders
  for insert to authenticated
  with check (from_user_id = auth.uid());
