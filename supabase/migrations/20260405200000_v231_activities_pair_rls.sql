-- Only see your tasks and your linked partner's — not the QA test account

drop policy if exists activities_select_authenticated on public.activities;

create policy activities_select_pair
  on public.activities
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or user_id = public.partner_id()
  );
