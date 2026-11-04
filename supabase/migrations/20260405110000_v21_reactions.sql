-- v2.1.1 reactions + Realtime publication

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('fist', 'fire', 'clap', 'heart')),
  created_at timestamptz not null default now(),
  unique (activity_id, from_user_id)
);

create index reactions_activity_id_idx on public.reactions (activity_id);

revoke all on table public.reactions from anon;
grant select, insert, update, delete on table public.reactions to authenticated;

alter table public.reactions enable row level security;

create policy reactions_select_pair
  on public.reactions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id
        and (a.user_id = auth.uid() or a.user_id = public.partner_id())
    )
  );

create policy reactions_insert_own_on_partner_activity
  on public.reactions
  for insert
  to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.activities a
      where a.id = activity_id
        and a.user_id = public.partner_id()
        and a.status = 'done'
    )
  );

create policy reactions_update_own
  on public.reactions
  for update
  to authenticated
  using (from_user_id = auth.uid())
  with check (from_user_id = auth.uid());

create policy reactions_delete_own
  on public.reactions
  for delete
  to authenticated
  using (from_user_id = auth.uid());

-- Enable Realtime in Dashboard if publication missing:
-- alter publication supabase_realtime add table public.reactions;
