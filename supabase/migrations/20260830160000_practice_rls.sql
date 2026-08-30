-- Phase 5: practice engine needs to record answers on attempt_questions.
-- The Phase 2 migration only shipped SELECT + INSERT policies for the
-- attempt-questions join table; the authenticated client cannot yet UPDATE
-- its own attempt rows. Policy mirrors aq_select_own (attempt must belong to
-- auth.uid()).
create policy aq_update_own on public.attempt_questions
  for update to authenticated
  using (exists (
    select 1 from public.test_attempts t
    where t.id = attempt_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.test_attempts t
    where t.id = attempt_id and t.user_id = auth.uid()
  ));

-- The grants from Phase 2 already cover select/insert/update for
-- authenticated; nothing further to grant here.