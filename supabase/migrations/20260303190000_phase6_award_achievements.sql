-- Phase 6: award_achievements() only
--
-- ROLLBACK:
-- revoke execute on function public.award_achievements() from authenticated;
-- drop function if exists public.award_achievements();

create or replace function public.award_achievements()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_done_count bigint;
  v_new text;
begin
  v_user := auth.uid();
  if v_user is null then
    return;
  end if;

  select count(*)
  into v_done_count
  from public.activities
  where user_id = v_user
    and status = 'done';

  if v_done_count >= 1 then
    insert into public.user_achievements (user_id, code)
    values (v_user, 'first_activity')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  if v_done_count >= 10 then
    v_new := null;
    insert into public.user_achievements (user_id, code)
    values (v_user, 'ten_done')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  if v_done_count >= 50 then
    v_new := null;
    insert into public.user_achievements (user_id, code)
    values (v_user, 'fifty_done')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  if exists (
    select 1
    from (
      select count(*) as streak_len
      from (
        select
          d.d,
          d.d - (row_number() over (order by d.d))::integer as grp
        from (
          select distinct planned_for as d
          from public.activities
          where user_id = v_user
            and status = 'done'
        ) d
      ) islands
      group by grp
    ) streaks
    where streak_len >= 3
  ) then
    v_new := null;
    insert into public.user_achievements (user_id, code)
    values (v_user, 'streak_3')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  if exists (
    select 1
    from (
      select count(*) as streak_len
      from (
        select
          d.d,
          d.d - (row_number() over (order by d.d))::integer as grp
        from (
          select distinct planned_for as d
          from public.activities
          where user_id = v_user
            and status = 'done'
        ) d
      ) islands
      group by grp
    ) streaks
    where streak_len >= 7
  ) then
    v_new := null;
    insert into public.user_achievements (user_id, code)
    values (v_user, 'streak_7')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  if exists (
    select 1
    from public.activities a
    where a.user_id = v_user
    group by a.planned_for
    having count(*) >= 3
       and count(*) = count(*) filter (where a.status = 'done')
  ) then
    v_new := null;
    insert into public.user_achievements (user_id, code)
    values (v_user, 'perfect_day')
    on conflict do nothing
    returning code into v_new;
    if v_new is not null then
      return next v_new;
    end if;
  end if;

  return;
end;
$$;

revoke execute on function public.award_achievements() from public;
revoke execute on function public.award_achievements() from anon;
grant execute on function public.award_achievements() to authenticated;
