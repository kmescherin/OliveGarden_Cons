"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateServiceRequestStatus(
  locale: string,
  requestId: string,
  status: "new" | "in_progress" | "done" | "cancelled",
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/services`);
  revalidatePath(`/${locale}/board/services`);
  return { ok: true as const };
}
