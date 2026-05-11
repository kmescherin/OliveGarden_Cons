import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the currently authenticated user's id. Convenience for Server
 * Actions that touch admin-client paths and need to pass `actorId` to
 * `recordAudit`. Returns `null` when no session is attached.
 */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Best-effort audit log emit. Wraps the `record_audit(...)` SQL helper from
 * migration 20260429000000_record_audit_helper.sql.
 *
 * Failures are logged via `console.warn` and never thrown — audit must
 * never block the user-visible flow. Server Actions that touch board-only
 * state should call this after a successful mutation.
 *
 * When invoked through the **user-context** client (`createClient()`),
 * the SQL function picks up `auth.uid()` automatically — pass
 * `actorId: undefined`. When invoked through the **admin** client
 * (`createAdminClient()`), `auth.uid()` is NULL inside the function, so
 * callers must pass `actorId` explicitly to attribute the change to a
 * human.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  args: {
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    actorId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.rpc("record_audit", {
    p_action: args.action,
    p_entity_type: args.entityType ?? null,
    p_entity_id: args.entityId ?? null,
    p_payload: args.payload ?? {},
    p_actor_id: args.actorId ?? null,
  });
  if (error) {
    console.warn(
      `[audit] record_audit failed for action=${args.action}: ${error.message}`,
    );
  }
}
