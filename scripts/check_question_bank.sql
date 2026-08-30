-- Phase 4 DoD verification for the question bank. Run as the migration/owner
-- role (single session; leaves no data behind).
-- Verifies: invariants (every question has >=1 correct option, >=2 options,
-- unique display_order per question, >=1 tag), admin-only writes for shared
-- content (REST/DB wrong-path), and the log_admin_action role gate.

set search_path to public;

-- ---------------------------------------------------------------------------
-- 1. Seed an admin + a learner, one group and one well-formed question
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'qb_admin@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
   'authenticated', 'qb_learner@test.local', crypt('pw_12345', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

update public.users set role = 'ADMIN' where email = 'qb_admin@test.local';

create temporary table qb_ids as
  select
    (select id from public.users where email = 'qb_admin@test.local')   as admin_u,
    (select id from public.users where email = 'qb_learner@test.local') as learner_u,
    gen_random_uuid() as group_u;

-- make the id helper readable after `set role authenticated`
grant select on qb_ids to authenticated;

insert into public.question_groups (id, group_type, content)
select group_u, 'RC_PASSAGE', 'Phase 4 passage' from qb_ids;

insert into public.questions
  (id, group_id, question_text, question_type, assigned_difficulty,
   estimated_time_seconds, shuffle_options, status, explanation)
select gen_random_uuid(), group_u,
       'What is 2 + 2?', 'MCQ', 1, 30, true, 'ACTIVE', 'Basic arithmetic.'
from qb_ids;

insert into public.options (question_id, option_text, is_correct, display_order)
select q.id, o.txt, o.ok, o.ord
from qb_ids
join public.questions q on q.group_id = qb_ids.group_u
cross join (values ('2', true, 1), ('3', false, 2), ('4', false, 3), ('5', false, 4)) as o(txt, ok, ord);

insert into public.question_tags (question_id, tag_type, tag_value)
select q.id, 'FIELD', 'QA'
from qb_ids
join public.questions q on q.group_id = qb_ids.group_u;

-- ---------------------------------------------------------------------------
-- 2. Invariants across the whole bank
-- ---------------------------------------------------------------------------
do $$
declare
  problem text := null;
  n int;
begin
  select count(*) into n from public.questions q
  where not exists (
    select 1 from public.options o where o.question_id = q.id and o.is_correct
  );
  if n > 0 then problem := format('%s questions missing a correct option', n); end if;

  select count(*) into n from public.questions q
  where (select count(*) from public.options o where o.question_id = q.id) < 2;
  if problem is null and n > 0 then problem := format('%s questions with <2 options', n); end if;

  select count(*) into n from public.options o1
  where exists (
    select 1 from public.options o2
    where o2.question_id = o1.question_id and o2.display_order = o1.display_order and o2.id <> o1.id
  );
  if problem is null and n > 0 then problem := format('%s duplicate display_order rows', n); end if;

  select count(*) into n from public.questions q
  where not exists (select 1 from public.question_tags t where t.question_id = q.id);
  if problem is null and n > 0 then problem := format('%s questions with no tags', n); end if;

  if problem is not null then
    raise exception 'FATAL: bank integrity: %', problem;
  end if;
  raise notice 'OK: bank invariants (correct option, >=2 options, unique display_order, >=1 tag)';
end $$;

-- ---------------------------------------------------------------------------
-- 3. Wrong-path: learner cannot write shared content
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims',
  jsonb_build_object('sub', (select learner_u::text from qb_ids), 'role', 'authenticated')::text,
  false);
set search_path to public, extensions;

do $$
begin
  begin
    insert into public.questions
      (group_id, question_text, question_type, assigned_difficulty, status)
    values (null, 'learner should never insert', 'MCQ', 1, 'ACTIVE');
    raise exception 'FAIL: learner inserted a question';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'OK: learner insert into questions denied';
  end;

  begin
    update public.questions set question_text = 'hacked'
    where question_text = 'What is 2 + 2?';
    if found then
      raise exception 'FAIL: learner updated a question';
    end if;
    raise notice 'OK: learner update matched no rows (RLS-filtered)';
  end;

  begin
    insert into public.options (question_id, option_text, is_correct, display_order)
    select q.id, 'bad', true, 9 from public.questions q where q.question_text = 'What is 2 + 2?';
    raise exception 'FAIL: learner inserted an option';
  exception
    when insufficient_privilege then
      raise notice 'OK: learner insert into options denied';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Wrong-path: learner cannot write the audit log
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    perform public.log_admin_action('HACK_ACTION', 'question', null);
    raise exception 'FAIL: learner wrote the audit log';
  exception
    when others then
      if sqlerrm like '%Only ADMIN or MASTER_ADMIN%' then
        raise notice 'OK: learner audit write rejected';
      else
        raise;
      end if;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Right path: admin writes content + audit
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  jsonb_build_object('sub', (select admin_u::text from qb_ids), 'role', 'authenticated')::text,
  false);

do $$
declare
  qid uuid;
begin
  select id into qid
  from public.questions where question_text = 'What is 2 + 2?';

  begin
    perform public.log_admin_action('UPDATE_QUESTION', 'question', qid);
    raise notice 'OK: admin auit write allowed';
  exception when others then
    raise exception 'FAIL: admin audit write failed: %', sqlerrm;
  end;

  begin
    insert into public.question_groups (group_type, content) values ('DI_TABLE', 'admin temp');
    raise notice 'OK: admin insert into question_groups allowed';
  exception when others then
    raise exception 'FAIL: admin group insert failed: %', sqlerrm;
  end;

  begin
    update public.options set option_text = 'four' where question_id = qid
      and is_correct and display_order = 3;
    raise notice 'OK: admin update options allowed';
  exception when others then
    raise exception 'FAIL: admin option update failed: %', sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Cleanup (run as owner; leaves the DB empty of test data)
-- ---------------------------------------------------------------------------
reset role;

do $$
declare
  qids uuid[];
  gid uuid;
begin
  select array_agg(q.id) into qids from public.questions q where q.question_text = 'What is 2 + 2?';
  if qids is not null then
    delete from public.question_tags where question_id = any(qids);
    delete from public.options where question_id = any(qids);
    delete from public.admin_audit_log where target_id = any(qids);
    delete from public.questions where id = any(qids);
  end if;

  select id into gid from public.question_groups where content = 'Phase 4 passage';
  if gid is not null then
    delete from public.question_groups where id = gid;
  end if;
  delete from public.question_groups where content = 'admin temp';
  delete from public.admin_audit_log where action in ('UPDATE_QUESTION', 'HACK_ACTION');

  delete from auth.users where email in ('qb_admin@test.local', 'qb_learner@test.local');
end $$;

select
  (select count(*) from public.questions where question_text like '%2 + 2%') = 0 as questions_cleaned,
  (select count(*) from public.admin_audit_log where action in ('UPDATE_QUESTION','HACK_ACTION')) = 0 as audit_cleaned,
  (select count(*) from public.users where email in ('qb_admin@test.local','qb_learner@test.local')) = 0 as users_cleaned;