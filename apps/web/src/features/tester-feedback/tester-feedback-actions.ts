"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import {
  testerFeedbackSchema,
  updateTesterFeedbackStatusSchema,
} from "@/lib/validations";
import { createActionFailure } from "@/lib/error-management";
import { recordAudit } from "@/lib/audit";

type Category = "bug" | "feature" | "question" | "other";
type Severity = "low" | "normal" | "high" | "critical";
type Status = "new" | "in_progress" | "resolved" | "wontfix";

export async function submitTesterFeedback(
  locale: string,
  input: {
    category: Category;
    severity: Severity;
    title: string;
    description: string;
    pageUrl: string;
    userAgent: string;
  },
) {
  const parsed = testerFeedbackSchema.safeParse({
    category: input.category,
    severity: input.severity,
    title: input.title,
    description: input.description,
    page_url: input.pageUrl,
    user_agent: input.userAgent,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const rl = checkRateLimit(`tfb:${user.id}`, RATE_LIMITS.testerFeedback);
  if (!rl.allowed) return rateLimitedResponse("testerFeedback");

  const { error } = await supabase.from("tester_feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    severity: parsed.data.severity,
    title: parsed.data.title,
    description: parsed.data.description || null,
    page_url: parsed.data.page_url || null,
    user_agent: parsed.data.user_agent || null,
  });
  if (error) {
    return createActionFailure("tester_feedback.create", error, {
      fallbackError: "Could not submit feedback",
      locale,
      userId: user.id,
    });
  }

  revalidatePath(`/${locale}/dashboard/feedback`);
  revalidatePath(`/${locale}/board/feedback`);
  return { ok: true as const };
}

export async function updateTesterFeedbackStatus(
  locale: string,
  id: string,
  status: Status,
  adminNote: string,
) {
  const parsed = updateTesterFeedbackStatusSchema.safeParse({
    id,
    status,
    adminNote,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tester_feedback")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.adminNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) {
    return createActionFailure("tester_feedback.update_status", error, {
      fallbackError: "Could not update feedback",
      locale,
      metadata: { feedbackId: parsed.data.id, status: parsed.data.status },
    });
  }

  await recordAudit(supabase, {
    action: "tester_feedback_status_changed",
    entityType: "tester_feedback",
    entityId: parsed.data.id,
    payload: {
      status: parsed.data.status,
      hasNote: Boolean(parsed.data.adminNote),
    },
  });

  revalidatePath(`/${locale}/dashboard/feedback`);
  revalidatePath(`/${locale}/board/feedback`);
  return { ok: true as const };
}
