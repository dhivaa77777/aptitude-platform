-- Phase 3: availability pre-checks for signup. RLS blocks anon/authenticated
-- SELECTs on public.users, so expose a safe, read-only existence check that
-- reads through RLS (security definer, search_path pinned).

create or replace function public.is_username_taken(username text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where users.username = is_username_taken.username)
$$;

grant execute on function public.is_username_taken(text) to anon, authenticated;

create or replace function public.is_email_taken(email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where users.email = is_email_taken.email)
$$;

grant execute on function public.is_email_taken(text) to anon, authenticated;