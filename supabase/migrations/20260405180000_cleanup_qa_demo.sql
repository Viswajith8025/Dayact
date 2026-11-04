-- One-time: remove Grok/e2e [QA] demo rows and strip [QA] prefix from display names

delete from public.activities
where title ilike '[QA]%' or title ilike '%[QA] %';

delete from public.challenges
where title ilike '[QA]%' or title ilike '%[QA]%';

update public.profiles
set display_name = trim(regexp_replace(display_name, '^\[QA\]\s*', '', 'i'))
where display_name ~* '^\[QA\]';
