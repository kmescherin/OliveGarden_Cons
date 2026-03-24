"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";
import type { AppRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

async function assertAdmin() {
  const f = await getStaffFlags();
  if (!f.admin) {
    throw new Error("forbidden");
  }
}

async function listAuthUsersPages(): Promise<User[]> {
  const admin = createAdminClient();
  const out: User[] = [];
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < perPage) break;
    if (!data.nextPage) break;
    page = data.nextPage;
  }
  return out;
}

async function countAdmins(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count ?? 0;
}

export async function grantAppRole(
  locale: string,
  userId: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
  if (error) {
    if (error.code === "23505") {
      return { ok: true as const };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true as const };
}

export async function revokeAppRole(
  locale: string,
  userId: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  if (role === "admin") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === userId) {
      const n = await countAdmins();
      if (n <= 1) {
        return { ok: false as const, error: "last_admin" };
      }
    }
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true as const };
}

export async function grantRoleByEmail(
  locale: string,
  email: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false as const, error: "bad_email" };
  }
  let users: User[];
  try {
    users = await listAuthUsersPages();
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "list_users_failed",
    };
  }
  const u = users.find((x) => (x.email ?? "").toLowerCase() === normalized);
  if (!u) {
    return { ok: false as const, error: "user_not_found" };
  }
  return grantAppRole(locale, u.id, role);
}

export async function loadAdminUsersForPage() {
  await assertAdmin();
  const adminDb = createAdminClient();
  const [authUsers, rolesRes, profilesRes] = await Promise.all([
    listAuthUsersPages(),
    adminDb.from("user_roles").select("user_id, role"),
    adminDb.from("profiles").select("*"),
  ]);
  if (rolesRes.error) throw rolesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of rolesRes.data ?? []) {
    const uid = row.user_id as string;
    const list = rolesByUser.get(uid) ?? [];
    list.push(row.role as AppRole);
    rolesByUser.set(uid, list);
  }
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );
  return authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    profile: profileById.get(u.id) ?? null,
    roles: rolesByUser.get(u.id) ?? [],
  }));
}
