import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let initialized = false;

export function initWebPush() {
  if (initialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails("mailto:noreply@olivegarden.example", publicKey, privateKey);
  initialized = true;
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string },
) {
  initWebPush();
  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (error || !subs?.length) return;

  const payloadStr = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payloadStr,
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("[web-push] Failed for sub", sub.id, err);
      }
    }
  }
}

export function generateVAPIDKeys() {
  return webpush.generateVAPIDKeys();
}
