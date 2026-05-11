"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceRequestSchema, updateServiceStatusSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { getStaffFlags } from "@/lib/profile";
import { createActionFailure } from "@/lib/error-management";

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
    return createActionFailure("service_requests.fetch_current", fetchErr, {
      fallbackError: "Could not load service request",
      locale,
      metadata: { requestId: parsed.data.requestId },
    });
  }
  if (current && validTransitions[current.status] && !validTransitions[current.status].includes(parsed.data.status)) {
    return { ok: false as const, error: "invalid_transition" };
  }

  const { error } = await supabase
    .from("service_requests")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.requestId);
  if (error) {
    return createActionFailure("service_requests.update_status", error, {
      fallbackError: "Could not update service request",
      locale,
      metadata: { requestId: parsed.data.requestId, status: parsed.data.status },
    });
  }
  revalidatePath(`/${locale}/dashboard/services`);
  revalidatePath(`/${locale}/board/services`);

  const { data: req } = await supabase
    .from("service_requests")
    .select("user_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (req) {
    const { createNotification } = await import("@/features/notifications/create-notification");
    await createNotification({
      userId: req.user_id,
      type: "request_status_changed",
      title: `Request ${parsed.data.status.replace("_", " ")}`,
      body: `Your service request status has been updated to: ${parsed.data.status}`,
      entityType: "service_request",
      entityId: parsed.data.requestId,
    });
  }

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
    return createActionFailure("service_requests.create", error, {
      fallbackError: "Could not create service request",
      locale,
      userId,
      metadata: { serviceTypeId: parsed.data.service_type_id },
    });
  }
  revalidatePath(`/${locale}/dashboard/services`);
  return { ok: true as const };
}
