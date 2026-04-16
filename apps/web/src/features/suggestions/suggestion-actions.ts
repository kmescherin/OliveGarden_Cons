"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { suggestionSchema, updateSuggestionStatusSchema } from "@/lib/validations";

export async function submitSuggestion(
  locale: string,
  title: string,
  body: string,
) {
  const parsed = suggestionSchema.safeParse({ title, body });
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

  const rl = checkRateLimit(`sug:${user.id}`, RATE_LIMITS.suggestion);
  if (!rl.allowed) return rateLimitedResponse("suggestion");

  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    title: parsed.data.title,
    body: parsed.data.body || null,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/suggestions`);
  return { ok: true as const };
}

export async function updateSuggestionStatus(
  locale: string,
  id: string,
  status: string,
  boardNote: string,
) {
  const parsed = updateSuggestionStatusSchema.safeParse({ id, status, boardNote });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({
      status: parsed.data.status,
      board_note: parsed.data.boardNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/suggestions`);
  revalidatePath(`/${locale}/board/suggestions`);
  return { ok: true as const };
}
