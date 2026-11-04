-- v2.3.1: explicit partner link, hide test accounts, fix streak/nudge partner resolution

alter table public.profiles
  add column if not exists partner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists is_test_account boolean not null default false;

update public.profiles
set is_test_account = true
where display_name ~* '^\[QA\]'
   or lower(trim(display_name)) in ('tester', 'test', 'qa tester');

update public.profiles j
set partner_user_id = m.id
from public.profiles m
where lower(trim(j.display_name)) = 'jithu'
  and lower(trim(m.display_name)) = 'meethu'
  and not j.is_test_account
  and not m.is_test_account;

update public.profiles m
set partner_user_id = j.id
from public.profiles j
where lower(trim(m.display_name)) = 'meethu'
  and lower(trim(j.display_name)) = 'jithu'
  and not j.is_test_account
  and not m.is_test_account;

delete from public.activities
where user_id in (select id from public.profiles where is_test_account);

delete from public.challenges
where created_by in (select id from public.profiles where is_test_account);

create or replace function public.partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.partner_user_id from public.profiles p where p.id = auth.uid()),
    (
      select p.id
      from public.profiles p
      where p.id <> auth.uid()
        and not p.is_test_account
      order by p.created_at asc
      limit 1
    )
  );
$$;

create or replace function public.list_partner_candidates()
returns table (id uuid, display_name text, avatar_emoji text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_emoji
  from public.profiles p
  where p.id <> auth.uid()
    and not p.is_test_account
  order by p.display_name;
$$;

revoke all on function public.list_partner_candidates() from public;
grant execute on function public.list_partner_candidates() to authenticated;

create or replace function public.set_partner(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_partner_id is null then
    update public.profiles set partner_user_id = null where id = v_me;
    update public.profiles set partner_user_id = null where partner_user_id = v_me;
    return;
  end if;

  if p_partner_id = v_me then
    raise exception 'Cannot link to yourself';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_partner_id and not p.is_test_account
  ) then
    raise exception 'Partner not found';
  end if;

  update public.profiles set partner_user_id = p_partner_id where id = v_me;
  update public.profiles set partner_user_id = v_me where id = p_partner_id;
end;
$$;

revoke all on function public.set_partner(uuid) from public;
grant execute on function public.set_partner(uuid) to authenticated;

create or replace function public.joint_streak_stats(p_tz text default 'UTC')
returns table (current_streak int, best_streak int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_partner uuid;
  v_today date;
  v_d date;
  v_cur int := 0;
  v_best int;
  v_joint boolean;
begin
  v_me := auth.uid();
  if v_me is null then
    return;
  end if;

  select joint_streak_best into v_best from public.profiles where id = v_me;
  v_best := coalesce(v_best, 0);

  v_partner := public.partner_id();
  if v_partner is null then
    current_streak := 0;
    best_streak := v_best;
    return next;
    return;
  end if;

  begin
    v_today := (timezone(coalesce(nullif(trim(p_tz), ''), 'UTC'), now()))::date;
  exception when others then
    v_today := (timezone('UTC', now()))::date;
  end;

  v_d := v_today;
  loop
    select exists (
      select 1 from public.activities a
      where a.user_id = v_me and a.status = 'done' and a.planned_for = v_d
    ) and exists (
      select 1 from public.activities a
      where a.user_id = v_partner and a.status = 'done' and a.planned_for = v_d
    ) into v_joint;

    exit when not v_joint;
    v_cur := v_cur + 1;
    v_d := v_d - 1;
  end loop;

  current_streak := v_cur;
  best_streak := greatest(v_best, v_cur);
  return next;
end;
$$;
