"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";

export async function saveCandidate(
  locale: string,
  id: string | null,
  formData: FormData,
) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const full_name = formData.get("full_name") as string;
  if (!full_name) {
    return { ok: false as const, error: "name_required" };
  }

  const admin = createAdminClient();
  const row = {
    full_name,
    program: (formData.get("program") as string) || null,
    election_year: Number(formData.get("election_year")) || new Date().getFullYear(),
    sort_order: Number(formData.get("sort_order")) || 0,
  };

  let error;
  if (id) {
    ({ error } = await admin.from("election_candidates").update(row).eq("id", id));
  } else {
    ({ error } = await admin.from("election_candidates").insert(row));
  }

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/${locale}/info/elections`);
  revalidatePath(`/${locale}/board/content`);
  return { ok: true as const };
}

export async function deleteCandidate(locale: string, id: string) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("election_candidates").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/${locale}/info/elections`);
  revalidatePath(`/${locale}/board/content`);
  return { ok: true as const };
}
