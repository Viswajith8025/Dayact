-- v2.2.0 pair-scoped profile reads

drop policy if exists profiles_select_authenticated on public.profiles;

create policy profiles_select_pair
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or id = public.partner_id());
