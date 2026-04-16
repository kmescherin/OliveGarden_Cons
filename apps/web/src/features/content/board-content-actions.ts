"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertContentPage(values: {
  slug: string;
  title: string;
  body: string;
  visibility: "public" | "residents";
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("content_pages").upsert(
    {
      slug: values.slug,
      title: values.title,
      body: values.body,
      visibility: values.visibility,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertSocialZone(values: {
  id?: string;
  name: string;
  description: string;
  schedule: string;
  sort_order: number;
}) {
  const supabase = await createClient();
  const row = {
    name: values.name,
    description: values.description,
    schedule: values.schedule,
    sort_order: values.sort_order,
  };
  const { error } = values.id
    ? await supabase.from("social_zones").update(row).eq("id", values.id)
    : await supabase.from("social_zones").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/zones");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertAnnouncement(values: {
  id?: string;
  title: string;
  body: string;
  visibility: "public" | "residents";
}) {
  const supabase = await createClient();
  const row = {
    title: values.title,
    body: values.body,
    visibility: values.visibility,
  };
  const { error } = values.id
    ? await supabase.from("announcements").update(row).eq("id", values.id)
    : await supabase.from("announcements").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/announcements");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/announcements");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertBoardMember(values: {
  id?: string;
  full_name: string;
  role_title: string;
  phone: string;
  email: string;
  sort_order: number;
}) {
  const supabase = await createClient();
  const row = {
    full_name: values.full_name,
    role_title: values.role_title,
    phone: values.phone,
    email: values.email,
    sort_order: values.sort_order,
  };
  const { error } = values.id
    ? await supabase.from("board_members").update(row).eq("id", values.id)
    : await supabase.from("board_members").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteBoardMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("board_members").delete().eq("id", id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}
