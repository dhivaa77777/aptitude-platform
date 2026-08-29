# MASTERPLAN.md — Aptitude Learning & Assessment Platform

This file is the single source of truth for the project. It is written to live at the root of the repository so that OpenCode (or any coding agent) can read it directly for full context on every session — reference it explicitly in prompts as `MASTERPLAN.md`.

---

## 1. What This Is

A one-website, three-role (Learner / Admin / Master Admin), dark-themed aptitude practice and timed-assessment platform for MBA/placement prep. Deterministic scoring and recommendations; AI is an optional, validated coaching layer only — never the source of truth for correctness.

Core loop: **Choose → Practice/Test → Analyze → Identify Weakness → Practice → Improve → Retest**

---

## 2. Non-Negotiable Design Rules

These constrain every phase below. An implementation that violates one of these is wrong even if it "works":

1. **Scoring is deterministic, computed in application code.** AI never decides correctness.
2. **Every option has an internal ID; the correct answer is an option ID, never a positional letter.** Display order is derived at render time from a seed of `(attempt_id, question_id)` — never stored as a separately-persisted shuffled row.
3. **Tags (field/category/topic/subtopic) live in a join table (`question_tags`), never as flat columns on `questions`.**
4. **Shared passages/tables/charts (DI sets, RC passages) live once in `question_groups`; sub-questions reference a `group_id`.**
5. **Every question carries both `assigned_difficulty` (always set) and `computed_difficulty` (nullable, populated later) from the very first migration.**
6. **Questions are disabled, never deleted, once they've appeared in any historical attempt.**
7. **Every test/practice attempt is a frozen historical snapshot** — the exact questions, exact displayed option order, correct answer at that time, and the user's answers — immune to later question edits.
8. **User data isolation is enforced at the database layer** (Postgres Row-Level Security if using Supabase) — never rely on application code alone to prevent cross-user data access.
9. **Sequential test navigation is enforced server-side, not just hidden in the UI** — a client that skips ahead must be rejected by the API, not just prevented by a disabled button.
10. **Anti-repetition uses the concrete algorithm in Section 5 below** — never plain `ORDER BY RANDOM()` across the whole bank.
11. **AI-generated question explanations for quantitative questions must pass an automated numeric re-derivation check before leaving `REVIEW_REQUIRED` status.**

---

## 3. Roles

- **LEARNER** — practice, test, own profile/history only.
- **ADMIN** — question bank management only (add/edit/disable questions, bulk import, resolve duplicates). No user data, no platform settings.
- **MASTER_ADMIN** — everything ADMIN can do, plus user management, platform analytics, system settings, audit log access.

All three authenticate through one login screen; the server determines routing by role post-authentication. There is no separate "admin login" page.

---

## 4. Database Schema (authoritative — do not deviate without updating this file)

```sql
-- users  (profile table; id = Supabase Auth auth.users.id, FK on delete cascade.
--         Auth owns credentials — no password_hash is stored by the app.)
id, name, username (unique), email (unique), role (LEARNER|ADMIN|MASTER_ADMIN),
status (ACTIVE|SUSPENDED), mfa_enabled, created_at, updated_at

-- user_preferences
user_id (FK, PK), preparation_fields (text[] with check 1..2), settings_json

-- question_groups
id, group_type (DI_TABLE|DI_CHART|RC_PASSAGE|CASELET), content, created_at

-- questions
id, group_id (FK, nullable), question_text, question_type, explanation,
assigned_difficulty (1-5), computed_difficulty (1-5, nullable),
estimated_time_seconds, shuffle_options (bool), status (ACTIVE|REVIEW_REQUIRED|DISABLED),
version, created_at, updated_at

-- options
id, question_id (FK), option_text, is_correct (bool), display_order

-- question_tags
id, question_id (FK), tag_type (FIELD|CATEGORY|TOPIC|SUBTOPIC), tag_value
  -- index on (tag_type, tag_value) and on (question_id)

-- user_question_history
user_id (FK), question_id (FK), last_seen_at, times_seen
  -- PK (user_id, question_id); index on (user_id, last_seen_at)

-- test_attempts
id, user_id (FK, nullable if guest), guest_session_id (nullable),
mode (PRACTICE|TEST), configuration_json,
status (IN_PROGRESS|COMPLETED|ABANDONED),
started_at, ended_at, score, accuracy

-- attempt_questions
id, attempt_id (FK), question_id (FK), display_order, option_order_seed,
correct_option_id_snapshot, user_selected_option_id, time_spent_seconds, is_correct
  -- index on (attempt_id)

-- user_topic_stats
user_id (FK), topic, attempts, correct, avg_time_seconds, updated_at
  -- PK (user_id, topic); index on (user_id)

-- recommendations
id, user_id (FK), topic, reason, recommended_action_json, generated_at

-- admin_audit_log
id, admin_id (FK), action, target_type, target_id, timestamp
```

**Row-Level Security enabled on every table.** Policies required on:
`test_attempts`, `attempt_questions`, `user_topic_stats`, `recommendations` —
restrict to `user_id = auth.uid()` with a separate policy granting
ADMIN/MASTER_ADMIN broader read access. Shared content
(`question_groups`, `questions`, `options`, `question_tags`) is readable by any
role (authenticated and anon/guest), written only by ADMIN/MASTER_ADMIN. Admin
writes go through the server (service role); audit log is MASTER_ADMIN-only at
the DB layer.

**Implementation notes (approved in Phase 2, migration `20260829184225_init_schema.sql`):**
- Controlled states are Postgres enums: `role`, `user_status`, `tag_type`,
  `question_type` (`MCQ`, `MULTI`), `group_type`, `attempt_mode`,
  `attempt_status`, `question_status`.
- `users.password_hash` is dropped — Supabase Auth owns credentials;
  `public.users.id` is `auth.uid()` with FK to `auth.users(id)`, and a trigger
  on `auth.users` auto-provisions the profile row.
- `user_preferences.preparation_fields` is `text[]` with a `1..2` count check.
- `attempt_questions.correct_option_id_snapshot` snapshots the option id at
  attempt time (no FK dependency that could be invalidated later).

---

## 5. Anti-Repetition Algorithm (exact spec)

1. Exclude any `question_id` where `user_question_history.last_seen_at` is within the last **14 days** for this user (configurable).
2. Among the remaining eligible pool (filtered by field/topic/difficulty), weight selection inversely by `times_seen`.
3. If the eligible pool is smaller than the requested count, fall back to including previously-seen questions ordered oldest-`last_seen_at`-first, rather than failing to fill the set.

---

## 6. Feature Scope by Phase

**MVP (build first):** signup/login (3 roles), 1–2 editable preparation fields, practice mode, test mode, five difficulty levels, tag-based selection with anti-repetition, stateless randomization, strict server-enforced sequential navigation, timer with auto-submit, resumable/abandonable attempts, deterministic scoring, results with topic breakdown, rule-based recommendations, full attempt snapshotting, Master Admin (MFA) with user management, question CRUD, bulk import with validation/duplicate-detection, basic platform overview numbers.

**Deferred (do not build until MVP is stable and explicitly requested):** AI Coach, computed/adaptive difficulty population, question variant generation, gamification, leaderboards, secondary ADMIN role, advanced question analytics.

## 7. Build Order

1. Product & UX design (screens, dark theme system, splash, responsive layouts)
2. Schema migration (Section 4, complete, before any question data is entered)
3. Authentication (3 roles, MFA for admin roles, session management)
4. Question bank (groups, tags, options, validation, duplicate detection, bulk import)
5. Practice engine (selection engine, anti-repetition, stateless randomization)
6. Test engine (config, timer, sequential nav enforced server-side, in-progress/resume/abandon states, snapshotting)
7. Analytics (deterministic scoring, `user_topic_stats` upsert pipeline)
8. Recommendation engine (threshold rules reading from `user_topic_stats`)
9. Admin dashboard (platform/user/question analytics, bulk import UI, audit log)
10. AI layer (only after 1–9 are stable and tested)
11. UI/UX polish
12. Testing (functional, question-integrity, navigation-bypass attempts, timer edge cases, RLS/cross-user-access attempts, responsive)

---

## 8. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js / React, Tailwind (dark theme only) |
| Backend | Next.js API routes |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth + Row-Level Security |
| Hosting | Vercel |
| Source control | GitHub |
| AI (Phase 10 only) | Any API-based LLM, called server-side only |

---

## 9. Security Requirements (checked at every phase)

- Password hashing, session/token management
- MFA required for ADMIN and MASTER_ADMIN
- Server-side authorization checks on every API route, backed by Postgres RLS
- Rate limiting on auth and bulk-import endpoints
- No client-trusted correctness or navigation logic — server is the source of truth
- Admin audit logging on every sensitive admin action

---

## 10. Definition of Done (per feature)

A feature is not complete until:
- It respects every rule in Section 2
- It has at least a basic automated test covering the "wrong" path (e.g., attempted navigation skip, attempted cross-user data fetch)
- It reads/writes only through the schema in Section 4 (no ad-hoc columns added without updating this file)
- It's been checked against the MVP/deferred boundary in Section 6 — no scope creep into deferred features without being asked
