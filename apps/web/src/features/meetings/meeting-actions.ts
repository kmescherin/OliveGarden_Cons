"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";
import { createNotificationForAllResidents } from "@/features/notifications/create-notification";
import { createActionFailure } from "@/lib/error-management";
import { recordAudit, currentUserId } from "@/lib/audit";

export async function saveMeeting(
  locale: string,
  id: string | null,
  formData: FormData,
) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const title = formData.get("title") as string;
  const scheduled_at = formData.get("scheduled_at") as string;
  if (!title || !scheduled_at) {
    return { ok: false as const, error: "title_and_date_required" };
  }

  const admin = createAdminClient();
  const row = {
    title,
    description: (formData.get("description") as string) || null,
    meeting_type: (formData.get("meeting_type") as string) || "regular",
    scheduled_at,
    location: (formData.get("location") as string) || null,
    agenda: (formData.get("agenda") as string) || null,
    minutes: (formData.get("minutes") as string) || null,
    status: (formData.get("status") as string) || "scheduled",
  };

  let error;
  if (id) {
    ({ error } = await admin.from("meetings").update(row).eq("id", id));
  } else {
    ({ error } = await admin.from("meetings").insert(row));
  }

  if (error) {
    return createActionFailure("meetings.save", error, {
      fallbackError: "Could not save meeting",
      locale,
      metadata: { meetingId: id, status: row.status },
    });
  }

  await recordAudit(admin, {
    action: id ? "meeting_updated" : "meeting_created",
    entityType: "meeting",
    entityId: id,
    payload: { title, scheduled_at, status: row.status },
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/info/meetings`);
  revalidatePath(`/${locale}/board/content`);

  if (!id) {
    await createNotificationForAllResidents({
      type: "meeting_scheduled",
      title,
      body: `Scheduled for ${new Date(scheduled_at).toLocaleString()}`,
      entityType: "meeting",
    });
  }

  return { ok: true as const };
}

export async function deleteMeeting(locale: string, id: string) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("meetings").delete().eq("id", id);
  if (error) {
    return createActionFailure("meetings.delete", error, {
      fallbackError: "Could not delete meeting",
      locale,
      metadata: { meetingId: id },
    });
  }

  await recordAudit(admin, {
    action: "meeting_deleted",
    entityType: "meeting",
    entityId: id,
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/info/meetings`);
  revalidatePath(`/${locale}/board/content`);
  return { ok: true as const };
}

export async function saveDecision(
  locale: string,
  meetingId: string | null,
  id: string | null,
  formData: FormData,
) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const title = formData.get("title") as string;
  if (!title) {
    return { ok: false as const, error: "title_required" };
  }

  const admin = createAdminClient();
  const row = {
    title,
    description: (formData.get("description") as string) || null,
    meeting_id: meetingId,
    decided_at: new Date().toISOString(),
  };

  let error;
  if (id) {
    ({ error } = await admin.from("decisions").update(row).eq("id", id));
  } else {
    ({ error } = await admin.from("decisions").insert(row));
  }

  if (error) {
    return createActionFailure("decisions.save", error, {
      fallbackError: "Could not save decision",
      locale,
      metadata: { meetingId, decisionId: id },
    });
  }

  await recordAudit(admin, {
    action: id ? "decision_updated" : "decision_created",
    entityType: "decision",
    entityId: id,
    payload: { title, meeting_id: meetingId },
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/info/meetings`);
  revalidatePath(`/${locale}/board/content`);

  if (!id) {
    await createNotificationForAllResidents({
      type: "decision_published",
      title,
      body: (formData.get("description") as string)?.slice(0, 200),
      entityType: "decision",
    });
  }

  return { ok: true as const };
}

export async function deleteDecision(locale: string, id: string) {
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("decisions").delete().eq("id", id);
  if (error) {
    return createActionFailure("decisions.delete", error, {
      fallbackError: "Could not delete decision",
      locale,
      metadata: { decisionId: id },
    });
  }

  await recordAudit(admin, {
    action: "decision_deleted",
    entityType: "decision",
    entityId: id,
    actorId: await currentUserId(),
  });

  revalidatePath(`/${locale}/info/meetings`);
  revalidatePath(`/${locale}/board/content`);
  return { ok: true as const };
}
