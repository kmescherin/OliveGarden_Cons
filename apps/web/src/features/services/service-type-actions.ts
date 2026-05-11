"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";
import { createActionFailure } from "@/lib/error-management";
import { recordAudit, currentUserId } from "@/lib/audit";

export async function saveServiceType(
  locale: string,
  id: string | null,
  formData: FormData,
) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const key = (formData.get("key") as string)?.trim() ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const description = (formData.get("description") as string)?.trim() ?? null;
  const sortOrder = Number(formData.get("sort_order")) || 0;

  if (!/^[a-zA-Z0-9-]+$/.test(key)) {
    return { ok: false as const, error: "key_invalid" };
  }
  if (!name) {
    return { ok: false as const, error: "name_required" };
  }

  const supabase = createAdminClient();
  const row = { key, name, description, sort_order: sortOrder };

  const { error } = id
    ? await supabase.from("service_types").update(row).eq("id", id)
    : await supabase.from("service_types").insert(row);

  if (error) {
    return createActionFailure("service_types.save", error, {
      fallbackError: "Could not save request type",
      locale,
      metadata: { serviceTypeId: id, key },
    });
  }

  await recordAudit(supabase, {
    action: id ? "service_type_updated" : "service_type_created",
    entityType: "service_type",
    entityId: id,
    payload: { key, name },
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/board/content`);
  revalidatePath(`/${locale}/dashboard/services`);
  return { ok: true as const };
}

export async function deleteServiceType(locale: string, id: string) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("service_types").delete().eq("id", id);
  if (error) {
    return createActionFailure("service_types.delete", error, {
      fallbackError: "Could not delete request type",
      locale,
      metadata: { serviceTypeId: id },
    });
  }

  await recordAudit(supabase, {
    action: "service_type_deleted",
    entityType: "service_type",
    entityId: id,
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/board/content`);
  revalidatePath(`/${locale}/dashboard/services`);
  return { ok: true as const };
}
