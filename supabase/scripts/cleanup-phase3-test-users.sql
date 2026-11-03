-- Phase 7 cleanup (DO NOT run from the app). Human-run in Supabase SQL Editor.
-- Removes test users dayact.phase3.a@gmail.com and dayact.phase3.b@gmail.com and rows they own.

begin;

create temporary table _cleanup_uids on commit drop as
select id
from auth.users
where email in (
  'dayact.phase3.a@gmail.com',
  'dayact.phase3.b@gmail.com'
);

delete from public.user_achievements
where user_id in (select id from _cleanup_uids);

delete from public.activities
where user_id in (select id from _cleanup_uids);

delete from public.profiles
where id in (select id from _cleanup_uids);

delete from auth.users
where id in (select id from _cleanup_uids);

commit;
