import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/database";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? "",
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });
  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}

export async function createNotificationForAllResidents(params: {
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}) {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("approval_status", "approved");

  if (error || !profiles?.length) return;

  const notifications = profiles.map((p) => ({
    user_id: p.id,
    type: params.type,
    title: params.title,
    body: params.body ?? "",
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  }));

  await admin.from("notifications").insert(notifications);
}
