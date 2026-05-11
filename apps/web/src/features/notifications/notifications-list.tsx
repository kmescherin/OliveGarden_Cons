"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export function NotificationsList() {
  const t = useTranslations("Notifications");
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data as Notification[]) ?? []));
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-hero flex items-center justify-between gap-4">
        <h1 className="dashboard-title">{t("title")}</h1>
        {items.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="rounded-full border border-border bg-card/45 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>
      {items.length === 0 && (
        <EmptyState title="No notifications" description="You're all caught up" />
      )}
      {items.map((n) => (
        <div
          key={n.id}
          className={cn(
            "dashboard-panel",
            !n.read && "border-primary/35 bg-primary/10",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{n.title}</p>
              {n.body && (
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.read && (
              <button
                onClick={() => markRead(n.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("markRead")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
