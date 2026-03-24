"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function moderateProfile(
  locale: string,
  targetUserId: string,
  status: "approved" | "rejected",
  note: string | null,
) {
  const trimmed = note?.trim() ?? "";
  if (status === "rejected" && !trimmed) {
    return {
      ok: false as const,
      error: "reject_requires_note",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_profile", {
    target_user_id: targetUserId,
    new_status: status,
    note: trimmed,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/board/moderation`);
  return { ok: true as const };
}
