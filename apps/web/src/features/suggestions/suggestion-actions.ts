"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitSuggestion(
  locale: string,
  title: string,
  body: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    title: title.trim(),
    body: body.trim() || null,
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({
      status,
      board_note: boardNote.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/suggestions`);
  revalidatePath(`/${locale}/board/suggestions`);
  return { ok: true as const };
}
