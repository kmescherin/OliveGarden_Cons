"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateProfileSchema } from "@/lib/validations";

export async function moderateProfile(
  locale: string,
  targetUserId: string,
  status: "approved" | "rejected",
  note: string | null,
) {
  const parsed = moderateProfileSchema.safeParse({ targetUserId, status, note: note ?? "" });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  if (parsed.data.status === "rejected" && !parsed.data.note) {
    return {
      ok: false as const,
      error: "reject_requires_note",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_profile", {
    target_user_id: parsed.data.targetUserId,
    new_status: parsed.data.status,
    note: parsed.data.note,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/board/moderation`);
  return { ok: true as const };
}
