-- Unlinked accounts see only their own rows. A recorded poke counts only after a push is delivered.

create or replace function public.partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.partner_user_id
  from public.profiles p
  where p.id = auth.uid();
$$;

alter table public.partner_reminders
  add column if not exists delivered boolean not null default false;
