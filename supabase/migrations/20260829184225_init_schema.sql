create extension if not exists pgcrypto;

-- ============================================================================
-- Enums (controlled system states, per MASTERPLAN.md Section 4 approval)
-- ============================================================================
create type public.role as enum ('LEARNER', 'ADMIN', 'MASTER_ADMIN');
create type public.user_status as enum ('ACTIVE', 'SUSPENDED');
create type public.tag_type as enum ('FIELD', 'CATEGORY', 'TOPIC', 'SUBTOPIC');
create type public.question_type as enum ('MCQ', 'MULTI');
create type public.group_type as enum ('DI_TABLE', 'DI_CHART', 'RC_PASSAGE', 'CASELET');
create type public.attempt_mode as enum ('PRACTICE', 'TEST');
create type public.attempt_status as enum ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
create type public.question_status as enum ('ACTIVE', 'REVIEW_REQUIRED', 'DISABLED');

-- ============================================================================
-- users  (profile table; id mirrors Supabase Auth auth.users.id)
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text not null unique,
  email text not null unique,
  role public.role not null default 'LEARNER',
  status public.user_status not null default 'ACTIVE',
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  preparation_fields text[] not null default '{}',
  settings_json jsonb not null default '{}',
  constraint preparation_fields_count check (cardinality(preparation_fields) between 1 and 2)
);

-- ============================================================================
-- Shared content (DI sets, RC passages, caselets live once here)
-- ============================================================================
create table public.question_groups (
  id uuid primary key default gen_random_uuid(),
  group_type public.group_type not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.question_groups(id),
  question_text text not null,
  question_type public.question_type not null default 'MCQ',
  explanation text,
  assigned_difficulty smallint not null check (assigned_difficulty between 1 and 5),
  computed_difficulty smallint check (computed_difficulty between 1 and 5),
  estimated_time_seconds integer,
  shuffle_options boolean not null default true,
  status public.question_status not null default 'ACTIVE',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  display_order integer not null default 0
);
create index options_question_id_idx on public.options (question_id);

create table public.question_tags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  tag_type public.tag_type not null,
  tag_value text not null
);
create index question_tags_type_value_idx on public.question_tags (tag_type, tag_value);
create index question_tags_question_idx on public.question_tags (question_id);

-- ============================================================================
-- Learner attempt / analytics data
-- ============================================================================
create table public.user_question_history (
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  times_seen integer not null default 0,
  primary key (user_id, question_id)
);
create index user_question_history_user_lastseen_idx on public.user_question_history (user_id, last_seen_at);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  guest_session_id text,
  mode public.attempt_mode not null,
  configuration_json jsonb not null default '{}',
  status public.attempt_status not null default 'IN_PROGRESS',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score numeric(5,2),
  accuracy numeric(5,2),
  constraint attempt_owner_present check (user_id is not null or guest_session_id is not null)
);

create table public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  display_order integer not null,
  option_order_seed bigint not null,
  correct_option_id_snapshot uuid references public.options(id),
  user_selected_option_id uuid references public.options(id),
  time_spent_seconds integer,
  is_correct boolean
);
create index attempt_questions_attempt_idx on public.attempt_questions (attempt_id);

create table public.user_topic_stats (
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  attempts integer not null default 0,
  correct integer not null default 0,
  avg_time_seconds numeric(10,2),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic)
);
create index user_topic_stats_user_idx on public.user_topic_stats (user_id);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  reason text not null,
  recommended_action_json jsonb not null default '{}',
  generated_at timestamptz not null default now()
);
create index recommendations_user_idx on public.recommendations (user_id);

-- ============================================================================
-- Admin audit
-- ============================================================================
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  timestamp timestamptz not null default now()
);

-- ============================================================================
-- Helpers & triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger trg_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

-- Current caller's role, read without RLS recursion (security definer).
create or replace function public.current_user_role()
returns public.role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- Policy-backed helper: only signed-in roles may call it directly.
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- Auto-provision a profile row whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Invoked only by the auth.users trigger; not exposed to API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.question_groups enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.question_tags enable row level security;
alter table public.user_question_history enable row level security;
alter table public.test_attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.user_topic_stats enable row level security;
alter table public.recommendations enable row level security;
alter table public.admin_audit_log enable row level security;

-- users
create policy users_select_own on public.users for select using (id = auth.uid());
create policy users_insert_self on public.users for insert with check (id = auth.uid());
create policy users_update_own on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_select_admin on public.users for select to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));
create policy users_update_admin on public.users for update to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN')) with check (true);

-- user_preferences
create policy prefs_select_own on public.user_preferences for select using (user_id = auth.uid());
create policy prefs_insert_own on public.user_preferences for insert with check (user_id = auth.uid());
create policy prefs_update_own on public.user_preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Shared content: readable by any role (guests included), written by admin roles only.
create policy content_select_authenticated on public.question_groups for select to authenticated using (true);
create policy content_select_anon on public.question_groups for select to anon using (true);
create policy content_admin_write on public.question_groups for all to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN')) with check (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));
create policy content_select_authenticated on public.questions for select to authenticated using (true);
create policy content_select_anon on public.questions for select to anon using (true);
create policy content_admin_write on public.questions for all to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN')) with check (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));
create policy content_select_authenticated on public.options for select to authenticated using (true);
create policy content_select_anon on public.options for select to anon using (true);
create policy content_admin_write on public.options for all to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN')) with check (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));
create policy content_select_authenticated on public.question_tags for select to authenticated using (true);
create policy content_select_anon on public.question_tags for select to anon using (true);
create policy content_admin_write on public.question_tags for all to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN')) with check (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));

-- user_question_history
create policy uqh_select_own on public.user_question_history for select using (user_id = auth.uid());
create policy uqh_insert_own on public.user_question_history for insert with check (user_id = auth.uid());
create policy uqh_update_own on public.user_question_history for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- test_attempts
create policy attempts_select_own on public.test_attempts for select using (user_id = auth.uid());
create policy attempts_insert_own on public.test_attempts for insert with check (user_id = auth.uid() or (user_id is null and guest_session_id is not null));
create policy attempts_update_own on public.test_attempts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy attempts_select_admin on public.test_attempts for select to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));

-- attempt_questions
create policy aq_select_own on public.attempt_questions for select using (exists (
  select 1 from public.test_attempts t where t.id = attempt_id and t.user_id = auth.uid()
));
create policy aq_insert_own on public.attempt_questions for insert with check (exists (
  select 1 from public.test_attempts t where t.id = attempt_id and t.user_id = auth.uid()
));
create policy aq_select_admin on public.attempt_questions for select to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));

-- user_topic_stats
create policy stats_select_own on public.user_topic_stats for select using (user_id = auth.uid());
create policy stats_insert_own on public.user_topic_stats for insert with check (user_id = auth.uid());
create policy stats_update_own on public.user_topic_stats for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy stats_select_admin on public.user_topic_stats for select to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));

-- recommendations
create policy recs_select_own on public.recommendations for select using (user_id = auth.uid());
create policy recs_insert_own on public.recommendations for insert with check (user_id = auth.uid());
create policy recs_select_admin on public.recommendations for select to authenticated using (public.current_user_role() in ('ADMIN', 'MASTER_ADMIN'));

-- admin_audit_log: MASTER_ADMIN only; service role writes via server code.
create policy audit_master_admin on public.admin_audit_log for all to authenticated using (public.current_user_role() = 'MASTER_ADMIN') with check (public.current_user_role() = 'MASTER_ADMIN');

-- ============================================================================
-- Privileges
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.question_groups, public.questions, public.options, public.question_tags to anon, authenticated;
grant select, insert, update on public.test_attempts to anon, authenticated;
grant select, insert, update on public.attempt_questions to anon, authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update on public.user_question_history to authenticated;
grant select, insert, update on public.user_topic_stats to authenticated;
grant select, insert on public.recommendations to authenticated;
grant select on public.admin_audit_log to authenticated;