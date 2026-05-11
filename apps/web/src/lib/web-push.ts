import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let initialized = false;
let warnedMissingKeys = false;

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

export function initWebPush(): boolean {
  if (initialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    if (!warnedMissingKeys) {
      warnedMissingKeys = true;
      console.warn(
        "[web-push] VAPID keys not configured (need NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY); push notifications disabled.",
      );
    }
    return false;
  }
  const contact = process.env.VAPID_CONTACT_EMAIL ?? "mailto:noreply@olivegarden.example";
  webpush.setVapidDetails(contact, publicKey, privateKey);
  initialized = true;
  return true;
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string },
) {
  if (!initWebPush()) return;
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
