-- Phase 3 bootstrap: promote an existing account to MASTER_ADMIN.
-- Sign up normally first (the auth trigger provisions your public.users row),
-- then run this against the project with YOUR OWN email/username substituted.
--
--   psql "$DATABASE_URL" -f scripts/promote_to_admin.sql
--
-- MASTER_ADMIN is the only role that can promote other users, so this must be
-- run manually (or via a safe SQL editor) exactly once for the first admin.

do $$
declare
  target uuid;
begin
  select id into target
  from public.users
  where lower(email) = lower('you@example.com')     -- <-- replace
     or username = 'your-username';                  -- <-- replace
  if target is null then
    raise exception 'No matching user found. Sign up first, then re-run.';
  end if;

  update public.users
  set role = 'MASTER_ADMIN'
  where id = target;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id)
  values (target, 'PROMOTE_TO_MASTER_ADMIN', 'users', target);

  raise notice 'Promoted % to MASTER_ADMIN', target;
end $$;