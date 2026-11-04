-- v2.1.3 couple challenges

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_count int not null check (target_count > 0),
  duration_days int not null check (duration_days > 0),
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_progress (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  done_count int not null default 0 check (done_count >= 0),
  primary key (challenge_id, user_id)
);

revoke all on table public.challenges from anon;
revoke all on table public.challenge_progress from anon;
grant select, insert, update on table public.challenges to authenticated;
grant select, insert, update on table public.challenge_progress to authenticated;

alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;

create policy challenges_select_pair
  on public.challenges for select to authenticated
  using (created_by = auth.uid() or created_by = public.partner_id());

create policy challenges_insert_own
  on public.challenges for insert to authenticated
  with check (created_by = auth.uid());

create policy challenges_update_pair
  on public.challenges for update to authenticated
  using (created_by = auth.uid() or created_by = public.partner_id());

create policy challenge_progress_select_pair
  on public.challenge_progress for select to authenticated
  using (user_id = auth.uid() or user_id = public.partner_id());

create policy challenge_progress_insert_own
  on public.challenge_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy challenge_progress_update_own
  on public.challenge_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
