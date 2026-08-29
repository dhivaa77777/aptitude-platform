-- Phase 2 DoD verification. Run as the migration/owner role (single session).
-- Verifies: enums, RLS enabled on all tables, key policies, FK to auth.users,
-- auto-provision trigger, and the RLS wrong-path behavior (user isolation,
-- learner write restrictions, admin access, guest/anonymous content read).

set search_path to public;

-- ---------------------------------------------------------------------------
-- 1. Structural checks
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
  missing boolean := false;
begin
  foreach tbl in array array[
    'users','user_preferences','question_groups','questions','options',
    'question_tags','user_question_history','test_attempts','attempt_questions',
    'user_topic_stats','recommendations','admin_audit_log'
  ] loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = tbl
    ) then
      raise notice 'MISSING TABLE %', tbl;
      missing := true;
    end if;
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = tbl and c.relrowsecurity
    ) then
      raise notice 'RLS NOT ENABLED ON %', tbl;
      missing := true;
    end if;
  end loop;
  if missing then
    raise exception 'FATAL: structural integrity failed';
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname in ('role','user_status','tag_type','question_type','group_type','attempt_mode','attempt_status','question_status')
  ) then
    raise exception 'FATAL: missing enum types';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conname = 'users_id_fkey' and c.conrelid = 'public.users'::regclass
  ) then
    raise exception 'FATAL: users FK to auth.users missing';
  end if;

  -- auth user auto-provision trigger
  if not exists (
    select 1 from pg_trigger t where t.tgname = 'on_auth_user_created'
  ) then
    raise exception 'FATAL: auth.users provisioning trigger missing';
  end if;

  raise notice 'OK: structure, RLS enablement, FK, trigger';
end $$;

-- ---------------------------------------------------------------------------
-- 2. Seed three test identities through real Supabase Auth rows
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'rlstest_a@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'rlstest_b@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'rlstest_admin@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

update public.users set role = 'ADMIN' where email = 'rlstest_admin@test.local';

create temporary table rls_ids as
  select
    (select id from public.users where email = 'rlstest_a@test.local')    as user_a,
    (select id from public.users where email = 'rlstest_b@test.local')    as user_b,
    (select id from public.users where email = 'rlstest_admin@test.local') as admin_u;

-- ---------------------------------------------------------------------------
-- 3. Seed shared content + attempts
-- ---------------------------------------------------------------------------
insert into public.question_groups (group_type, content)
values ('RC_PASSAGE', 'RLS test passage');

insert into public.questions
  (group_id, question_text, question_type, assigned_difficulty, computed_difficulty)
values
  ((select id from public.question_groups limit 1),
   'RLS test question?', 'MCQ', 2, 2);

insert into public.options (question_id, option_text, is_correct, display_order)
select q.id, o.txt, o.ok, o.ord
from public.questions q
cross join (
  values ('A1', true, 1), ('A2', false, 2), ('A3', false, 3), ('A4', false, 4)
) as o(txt, ok, ord);

insert into public.test_attempts (user_id, mode, configuration_json)
select id, 'TEST', jsonb_build_object('topic', 'rlstest') from rls_ids where rls_ids.user_a = users.id;

insert into public.test_attempts (user_id, mode, configuration_json)
select id, 'TEST', jsonb_build_object('topic', 'rlstest') from rls_ids where rls_ids.user_b = users.id;

insert into public.user_topic_stats (user_id, topic, attempts, correct, avg_time_seconds)
select user_a, 'RLS Topic', 10, 4, 55.0 from rls_ids;

insert into public.user_topic_stats (user_id, topic, attempts, correct, avg_time_seconds)
select user_b, 'RLS Topic', 8, 7, 40.0 from rls_ids;

insert into public.recommendations (user_id, topic, reason)
select user_a, 'RLS Topic', 'rlstest reason' from rls_ids;

insert into public.recommendations (user_id, topic, reason)
select user_b, 'RLS Topic', 'rlstest reason' from rls_ids;

insert into public.attempt_questions
  (attempt_id, question_id, display_order, option_order_seed,
   correct_option_id_snapshot, user_selected_option_id, time_spent_seconds, is_correct)
select a.id, q.id, 1, 42, o.id, o.id, 30, true
from public.test_attempts a
cross join public.questions q
join public.options o on o.question_id = q.id and o.is_correct;

-- ---------------------------------------------------------------------------
-- 4. Wrong-path: user A can only see own data
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', (select user_a::text from rls_ids), 'role', 'authenticated')::text,
  false);
set search_path to public;

do $$
declare n int;
begin
  select count(*) into n from test_attempts;
  if n <> 1 then raise exception 'A FAIL: test_attempts visible = %, want 1', n; end if;

  select count(*) into n from attempt_questions;
  if n <> 1 then raise exception 'A FAIL: attempt_questions visible = %, want 1', n; end if;

  select count(*) into n from user_topic_stats;
  if n <> 1 then raise exception 'A FAIL: user_topic_stats visible = %, want 1', n; end if;

  select count(*) into n from recommendations;
  if n <> 1 then raise exception 'A FAIL: recommendations visible = %, want 1', n; end if;

  -- learner must NOT edit shared content
  update public.questions set question_text = 'hacked';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'A FAIL: learner modified questions (%, want 0)', n; end if;

  -- learner must NOT touch other user data
  update public.user_topic_stats set attempts = 999 where user_id = (select user_b from rls_ids);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'A FAIL: learner modified other stats (%, want 0)', n; end if;

  -- learner CAN update own attempt metadata (frozen snapshots protected elsewhere)
  update public.test_attempts set score = 88 where user_id = auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'A FAIL: learner could not update own attempt (%, want 1)', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Admin can read all and edit content
-- ---------------------------------------------------------------------------
reset role;
set role authenticated;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', (select admin_u::text from rls_ids), 'role', 'authenticated')::text,
  false);
set search_path to public;

do $$
declare n int;
begin
  select count(*) into n from test_attempts;
  if n <> 2 then raise exception 'ADMIN FAIL: test_attempts visible = %, want 2', n; end if;

  select count(*) into n from attempt_questions;
  if n <> 2 then raise exception 'ADMIN FAIL: attempt_questions visible = %, want 2', n; end if;

  update public.questions set question_text = 'rlstest admin edit';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ADMIN FAIL: could not edit content (%, want 1)', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Anonymous (guest) can read shared content, sees no attempt data
-- ---------------------------------------------------------------------------
reset role;
set role anon;
select set_config('request.jwt.claims', '{}', false);
set search_path to public;

do $$
declare n int;
begin
  select count(*) into n from public.questions;
  if n <> 1 then raise exception 'ANON FAIL: content readable = %, want 1', n; end if;

  select count(*) into n from public.test_attempts;
  if n <> 0 then raise exception 'ANON FAIL: attempts visible = %, want 0', n; end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 7. Cleanup + verify empty
-- ---------------------------------------------------------------------------
delete from auth.users where email like 'rlstest_%@test.local';
delete from public.test_attempts;
delete from public.questions;
delete from public.question_groups;

do $$
declare n int;
begin
  select count(*) into n from public.users where email like 'rlstest_%@test.local';
  if n <> 0 then raise exception 'CLEANUP FAIL: leftover users %', n; end if;

  select count(*) into n from public.test_attempts;
  if n <> 0 then raise exception 'CLEANUP FAIL: leftover attempts %', n; end if;

  select count(*) into n from public.questions;
  if n <> 0 then raise exception 'CLEANUP FAIL: leftover questions %', n; end if;

  select count(*) into n from public.options;
  if n <> 0 then raise exception 'CLEANUP FAIL: leftover options %', n; end if;
end $$;

raise notice 'ALL PHASE 2 CHECKS PASSED';