"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  contentPageSchema,
  socialZoneSchema,
  announcementSchema,
  deleteByIdSchema,
  boardMemberSchema,
} from "@/lib/validations";

export async function upsertContentPage(values: {
  slug: string;
  title: string;
  body: string;
  visibility: "public" | "residents";
}) {
  const parsed = contentPageSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("content_pages").upsert(
    {
      slug: parsed.data.slug,
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
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
  const parsed = socialZoneSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const row = {
    name: parsed.data.name,
    description: parsed.data.description,
    schedule: parsed.data.schedule,
    sort_order: parsed.data.sort_order,
  };
  const { error } = parsed.data.id
    ? await supabase.from("social_zones").update(row).eq("id", parsed.data.id)
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
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const row = {
    title: parsed.data.title,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  };
  const { error } = parsed.data.id
    ? await supabase.from("announcements").update(row).eq("id", parsed.data.id)
    : await supabase.from("announcements").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/announcements");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const parsed = deleteByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", parsed.data.id);
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
  const parsed = boardMemberSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const row = {
    full_name: parsed.data.full_name,
    role_title: parsed.data.role_title,
    phone: parsed.data.phone,
    email: parsed.data.email,
    sort_order: parsed.data.sort_order,
  };
  const { error } = parsed.data.id
    ? await supabase.from("board_members").update(row).eq("id", parsed.data.id)
    : await supabase.from("board_members").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteBoardMember(id: string) {
  const parsed = deleteByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("board_members").delete().eq("id", parsed.data.id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}
