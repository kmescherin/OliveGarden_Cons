"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export async function createGuestPass(locale: string, formData: FormData) {
  const { user } = await getProfile();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const guest_name = (formData.get("guest_name") as string)?.trim();
  const valid_from = formData.get("valid_from") as string;
  const valid_until = formData.get("valid_until") as string;

  if (!guest_name || !valid_from || !valid_until) {
    return { ok: false as const, error: "required_fields" };
  }

  const pass_type = (formData.get("pass_type") as string) || "pedestrian";
  const plate_number = (formData.get("plate_number") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("guest_passes").insert({
    user_id: user.id,
    guest_name,
    pass_type,
    plate_number: pass_type === "car" ? plate_number : null,
    valid_from: new Date(valid_from).toISOString(),
    valid_until: new Date(valid_until).toISOString(),
    notes,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${locale}/dashboard/parking`);
  revalidatePath(`/${locale}/board/parking`);
  return { ok: true as const };
}

export async function cancelGuestPass(locale: string, id: string) {
  const { user } = await getProfile();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("guest_passes")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${locale}/dashboard/parking`);
  revalidatePath(`/${locale}/board/parking`);
  return { ok: true as const };
}
