-- Helper SQL function so server actions can record audit entries with one
-- call instead of hand-rolling an `insert into audit_log` everywhere.
--
-- `security definer` because `public.audit_log` has RLS enabled but no
-- INSERT policy (read-only for board, written only by privileged
-- functions). Mirrors the existing `moderate_profile` definer pattern.
-- The function fixes `search_path = public` and ignores any caller-set
-- search_path, so it isn't a privilege-escalation surface.
--
-- The actor is captured automatically via `auth.uid()` for user-context
-- callers, and via the optional `p_actor_id` override for service-role
-- (admin client) callers where `auth.uid()` is NULL.
--
-- Example usage from a Server Action:
--   await supabase.rpc('record_audit', {
--     p_action: 'service_request_status_changed',
--     p_entity_type: 'service_request',
--     p_entity_id: requestId,
--     p_payload: { from: 'new', to: 'in_progress' }
--   });

create or replace function public.record_audit (
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  new_id uuid;
  resolved_actor uuid;
begin
  resolved_actor := coalesce(p_actor_id, auth.uid());
  insert into public.audit_log (actor_id, action, entity_type, entity_id, payload)
  values (resolved_actor, p_action, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

-- Restrict invocation to authenticated callers (and service_role for the
-- admin client). Anonymous sessions cannot record audit rows.
revoke all on function public.record_audit(text, text, text, jsonb, uuid) from public;
grant execute on function public.record_audit(text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.record_audit(text, text, text, jsonb, uuid) to service_role;
