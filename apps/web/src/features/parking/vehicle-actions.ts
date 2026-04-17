"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export async function addVehicle(locale: string, formData: FormData) {
  const { user } = await getProfile();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const plate_number = (formData.get("plate_number") as string)?.trim();
  if (!plate_number) return { ok: false as const, error: "plate_required" };

  const is_temporary = formData.get("is_temporary") === "on";
  const vehicle_description = (formData.get("vehicle_description") as string)?.trim() || null;
  const valid_from = (formData.get("valid_from") as string) || null;
  const valid_until = (formData.get("valid_until") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert({
    user_id: user.id,
    plate_number,
    vehicle_description,
    is_temporary,
    valid_from: is_temporary && valid_from ? new Date(valid_from).toISOString() : null,
    valid_until: is_temporary && valid_until ? new Date(valid_until).toISOString() : null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${locale}/dashboard/parking`);
  revalidatePath(`/${locale}/board/parking`);
  return { ok: true as const };
}

export async function removeVehicle(locale: string, id: string) {
  const { user } = await getProfile();
  if (!user) return { ok: false as const, error: "unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/${locale}/dashboard/parking`);
  revalidatePath(`/${locale}/board/parking`);
  return { ok: true as const };
}
