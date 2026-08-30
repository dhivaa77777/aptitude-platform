-- Phase 4: security-definer audit helper so ADMIN/MASTER_ADMIN question-bank
-- actions (which run with the user's own session, not the service role) can
-- write to admin_audit_log. admin_audit_log stays SELECT-only for
-- authenticated users; this function is the only write path and enforces the
-- admin-role check itself.

create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('ADMIN', 'MASTER_ADMIN') then
    raise exception 'Only ADMIN or MASTER_ADMIN can write the audit log';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id)
  values (auth.uid(), p_action, p_target_type, p_target_id);
end;
$$;

revoke execute on function public.log_admin_action(text, text, uuid) from public, anon;
grant execute on function public.log_admin_action(text, text, uuid) to authenticated;