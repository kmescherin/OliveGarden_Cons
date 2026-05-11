"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffFlags } from "@/lib/profile";
import { createActionFailure } from "@/lib/error-management";

export async function issueKeyFob(locale: string, formData: FormData) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const user_id = formData.get("user_id") as string;
  const key_type = formData.get("key_type") as string;
  const identifier = (formData.get("identifier") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!user_id || !key_type || !identifier) {
    return { ok: false as const, error: "required_fields" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("key_fobs").insert({
    user_id,
    key_type,
    identifier,
    notes,
  });

  if (error) {
    return createActionFailure("parking.key_fob.issue", error, {
      fallbackError: "Could not issue key or fob",
      locale,
      metadata: { userId: user_id, keyType: key_type, identifier },
    });
  }

  revalidatePath(`/${locale}/board/parking`);
  revalidatePath(`/${locale}/dashboard/parking`);
  return { ok: true as const };
}

export async function updateKeyFobStatus(
  locale: string,
  id: string,
  status: string,
) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  if (!["returned", "lost"].includes(status)) {
    return { ok: false as const, error: "invalid_status" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("key_fobs")
    .update({ status })
    .eq("id", id);

  if (error) {
    return createActionFailure("parking.key_fob.update_status", error, {
      fallbackError: "Could not update key or fob",
      locale,
      metadata: { keyFobId: id, status },
    });
  }

  revalidatePath(`/${locale}/board/parking`);
  revalidatePath(`/${locale}/dashboard/parking`);
  return { ok: true as const };
}
