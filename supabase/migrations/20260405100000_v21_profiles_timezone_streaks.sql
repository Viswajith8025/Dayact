-- v2.1.0: timezone, joint streak persistence, partner helper, evening nudge dedupe

alter table public.profiles
  add column if not exists timezone text not null default 'UTC',
  add column if not exists joint_streak_best int not null default 0,
  add column if not exists last_evening_nudge_date date;

revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_emoji, timezone) on table public.profiles to authenticated;

create or replace function public.partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where id <> auth.uid() order by created_at asc limit 1;
$$;

revoke all on function public.partner_id() from public;
grant execute on function public.partner_id() to authenticated;

-- Joint streak: days where both users have >=1 done activity (planned_for = date in tz)
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

  select id into v_partner from public.profiles where id <> v_me order by created_at asc limit 1;
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

revoke all on function public.joint_streak_stats(text) from public;
grant execute on function public.joint_streak_stats(text) to authenticated;

create or replace function public.update_joint_streak_best(p_current int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_new int;
begin
  v_me := auth.uid();
  if v_me is null then
    return 0;
  end if;

  update public.profiles
  set joint_streak_best = greatest(joint_streak_best, greatest(p_current, 0))
  where id = v_me
  returning joint_streak_best into v_new;

  return coalesce(v_new, 0);
end;
$$;

revoke all on function public.update_joint_streak_best(int) from public;
grant execute on function public.update_joint_streak_best(int) to authenticated;
