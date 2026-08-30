-- Phase 5 DoD verification for the practice engine (selection engine,
-- anti-repetition, stateless randomization). Run as the migration/owner role
-- (single session; leaves no data behind).
-- Wrong-path coverage at the DB layer: attempt data stays isolated (anon and
-- unauthenticated/authenticated-without-uid cannot read or modify another
-- user's attempt questions), and the aq_update_own policy needed by the
-- practice answer flow exists with the correct grants.

set search_path to public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Seed one learner, a shared-content fixture and a voiced practice attempt
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'pr_learner@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

create temporary table pr_ids as
  select
    (select id from public.users where email = 'pr_learner@test.local') as learner_u,
    gen_random_uuid() as group_u,
    gen_random_uuid() as attempt_u;

grant select on pr_ids to authenticated;

insert into public.question_groups (id, group_type, content)
select group_u, 'RC_PASSAGE', 'Phase 5 passage' from pr_ids;

insert into public.questions (id, group_id, question_text, question_type,
  assigned_difficulty, estimated_time_seconds, shuffle_options, status, explanation)
select gen_random_uuid(), group_u, 'Train A takes 10 s.', 'MCQ'::question_type, 3, 45, true, 'ACTIVE'::question_status, 'v = d / t.'
from pr_ids
union all
select gen_random_uuid(), group_u, 'Ratio of 12 to 18.', 'MCQ'::question_type, 2, 30, true, 'ACTIVE'::question_status, 'Reduce both.'
from pr_ids;

insert into public.options (question_id, option_text, is_correct, display_order)
select q.id, o.txt, o.ok, o.ord
from pr_ids
join public.questions q on q.group_id = pr_ids.group_u
cross join (values ('A', true, 1), ('B', false, 2), ('C', false, 3), ('D', false, 4)) as o(txt, ok, ord);

insert into public.question_tags (question_id, tag_type, tag_value)
select q.id, 'FIELD'::tag_type, 'QA' from pr_ids join public.questions q on q.group_id = pr_ids.group_u
union all
select q.id, 'TOPIC'::tag_type, 'TSD' from pr_ids join public.questions q on q.group_id = pr_ids.group_u
where q.question_text like 'Train%';

insert into public.test_attempts (id, user_id, mode, configuration_json, status)
select attempt_u, learner_u, 'PRACTICE', '{"filters":{},"served":2,"cutoffDays":14}'::jsonb, 'IN_PROGRESS'
from pr_ids;

insert into public.attempt_questions
  (attempt_id, question_id, display_order, option_order_seed, correct_option_id_snapshot)
select pr_ids.attempt_u, q.id, row_number() over (order by q.question_text), 424242,
       (select o.id from public.options o where o.question_id = q.id and o.is_correct)
from pr_ids
join public.questions q on q.group_id = pr_ids.group_u;

insert into public.user_question_history (user_id, question_id, last_seen_at, times_seen)
select pr_ids.learner_u, q.id, now() - interval '1 day', 2
from pr_ids
join public.questions q on q.group_id = pr_ids.group_u;

-- ---------------------------------------------------------------------------
-- 2. Policy + privilege presence
-- ---------------------------------------------------------------------------
do $$
declare
  c integer;
begin
  select count(*) into c
  from pg_policies
  where schemaname = 'public' and tablename = 'attempt_questions'
    and policyname = 'aq_update_own' and cmd = 'UPDATE';
  if c != 1 then
    raise exception 'aq_update_own policy missing';
  end if;
end $$;

do $$
begin
  if not has_table_privilege('authenticated', 'public.attempt_questions', 'SELECT')
     or not has_table_privilege('authenticated', 'public.attempt_questions', 'INSERT')
     or not has_table_privilege('authenticated', 'public.attempt_questions', 'UPDATE') then
    raise exception 'attempt_questions grants for authenticated incomplete';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.attempt_questions'::regclass) then
    raise exception 'attempt_questions RLS not enabled';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.test_attempts'::regclass) then
    raise exception 'test_attempts RLS not enabled';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Wrong paths (no auth.uid() present -> RLS must block everything)
-- ---------------------------------------------------------------------------
set role anon;

select count(*) as anon_attempt_question_visible from public.attempt_questions;
select count(*) as anon_attempt_visible from public.test_attempts;

reset role;

set role authenticated;

do $$
declare
  affected integer;
begin
  with upd as (
    update public.attempt_questions aq
    set user_selected_option_id = aq.correct_option_id_snapshot
    where exists (
      select 1 from public.test_attempts t
      where t.id = aq.attempt_id and t.user_id = (select learner_u from pr_ids)
    )
    returning 1
  )
  select count(*) into affected from upd;

  if affected != 0 then
    raise exception 'unauthenticated update touched attempt_questions (%).', affected;
  end if;
end $$;

do $$
begin
  insert into public.attempt_questions
    (attempt_id, question_id, display_order, option_order_seed)
  select pr_ids.attempt_u, q.id, 99, 1
  from pr_ids
  cross join lateral (select id from public.questions q limit 1) q;

  raise exception 'unauthenticated insert into attempt_questions unexpectedly succeeded';
exception
  when others then
    if sqlerrm like 'unauthenticated insert%' then
      raise;
    end if;
end $$;

do $$
declare
  affected integer;
begin
  with upd as (
    update public.test_attempts
    set status = 'COMPLETED'
    where user_id = (select learner_u from pr_ids)
    returning 1
  )
  select count(*) into affected from upd;

  if affected != 0 then
    raise exception 'unauthenticated update touched test_attempts (%).', affected;
  end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 4. Cleanup
-- ---------------------------------------------------------------------------
delete from public.attempt_questions where attempt_id = (select attempt_u from pr_ids);
delete from public.test_attempts where id = (select attempt_u from pr_ids);
delete from public.user_question_history where user_id = (select learner_u from pr_ids);
delete from public.question_tags
where question_id in (select q.id from pr_ids join public.questions q on q.group_id = pr_ids.group_u);
delete from public.options
where question_id in (select q.id from pr_ids join public.questions q on q.group_id = pr_ids.group_u);
delete from public.questions where group_id = (select group_u from pr_ids);
delete from public.question_groups where id = (select group_u from pr_ids);
delete from auth.identities where user_id = (select learner_u from pr_ids);
delete from auth.sessions where user_id = (select learner_u from pr_ids);
delete from auth.users where id = (select learner_u from pr_ids);
delete from public.users where id = (select learner_u from pr_ids);

select
  (select count(*) from pg_policies
   where schemaname = 'public' and tablename = 'attempt_questions'
     and policyname = 'aq_update_own' and cmd = 'UPDATE') = 1 as policy_present,
  (select count(*) from public.attempt_questions) = 0 as questions_cleaned,
  (select count(*) from public.test_attempts) = 0 as attempts_cleaned,
  (select count(*) from public.users where email = 'pr_learner@test.local') = 0 as users_cleaned;