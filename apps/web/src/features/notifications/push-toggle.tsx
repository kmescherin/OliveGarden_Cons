"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export function PushToggle() {
  const t = useTranslations("WebPush");
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
    if ("Notification" in window && Notification.permission === "denied") {
      setPermissionDenied(true);
    }
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPermissionDenied(true);
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (res.ok) setEnabled(true);
    } catch (err) {
      console.error("[push] Enable failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } catch (err) {
      console.error("[push] Disable failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return <p className="text-sm text-muted-foreground">{t("unsupported")}</p>;
  }

  if (permissionDenied) {
    return <p className="text-sm text-muted-foreground">{t("permissionDenied")}</p>;
  }

  return (
    <button
      onClick={enabled ? disable : enable}
      disabled={loading}
      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
    >
      {enabled ? t("disable") : t("enable")}
    </button>
  );
}
