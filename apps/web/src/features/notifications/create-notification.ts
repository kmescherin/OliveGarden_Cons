import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/web-push";
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
    return;
  }

  const title = params.title;
  const body = params.body ?? "";

  sendPushNotification(params.userId, { title, body }).catch(() => {});

  admin.auth.admin
    .getUserById(params.userId)
    .then(({ data }) => {
      const email = data.user?.email;
      if (email) {
        return sendEmail({ to: email, subject: title, html: `<p>${body}</p>`, text: body });
      }
    })
    .catch(() => {});
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

  const title = params.title;
  const body = params.body ?? "";

  for (const p of profiles) {
    sendPushNotification(p.id, { title, body }).catch(() => {});
    admin.auth.admin
      .getUserById(p.id)
      .then(({ data }) => {
        const email = data.user?.email;
        if (email) {
          return sendEmail({ to: email, subject: title, html: `<p>${body}</p>`, text: body });
        }
      })
      .catch(() => {});
  }
}
