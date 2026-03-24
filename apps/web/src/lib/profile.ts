import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getProfile(): Promise<{
  user: import("@supabase/supabase-js").User | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile: profile as Profile | null };
}

export const getStaffFlags = cache(async (): Promise<{
  board: boolean;
  admin: boolean;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { board: false, admin: false };
  /* SSR: read roles with service role, scoped to session user (avoids empty RLS reads). */
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) {
    console.error("getStaffFlags user_roles", error.message);
    return { board: false, admin: false };
  }
  const roles = new Set((data ?? []).map((r) => r.role as string));
  return {
    admin: roles.has("admin"),
    board: roles.has("board") || roles.has("admin"),
  };
});

export const isBoardMember = cache(async (): Promise<boolean> => {
  const f = await getStaffFlags();
  return f.board;
});
