"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRequestSchema, updateServiceStatusSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { getStaffFlags } from "@/lib/profile";

export async function updateServiceRequestStatus(
  locale: string,
  requestId: string,
  status: "new" | "in_progress" | "done" | "cancelled",
) {
  const parsed = updateServiceStatusSchema.safeParse({ requestId, status });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const validTransitions: Record<string, string[]> = {
    new: ["in_progress", "cancelled"],
    in_progress: ["done", "cancelled"],
  };

  const supabase = await createClient();
  const { data: current, error: fetchErr } = await supabase
    .from("service_requests")
    .select("status")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (fetchErr) {
    return { ok: false as const, error: fetchErr.message };
  }
  if (current && validTransitions[current.status] && !validTransitions[current.status].includes(parsed.data.status)) {
    return { ok: false as const, error: "invalid_transition" };
  }

  const { error } = await supabase
    .from("service_requests")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.requestId);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/services`);
  revalidatePath(`/${locale}/board/services`);
  return { ok: true as const };
}

export async function createServiceRequest(
  locale: string,
  userId: string,
  formData: { service_type_id: string; description: string; preferred_at: string | null },
) {
  const rl = checkRateLimit(`sr:${userId}`, RATE_LIMITS.serviceRequest);
  if (!rl.allowed) return rateLimitedResponse("serviceRequest");

  const parsed = serviceRequestSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("service_requests").insert({
    user_id: userId,
    service_type_id: parsed.data.service_type_id,
    description: parsed.data.description,
    preferred_at: parsed.data.preferred_at ?? null,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/services`);
  return { ok: true as const };
}
