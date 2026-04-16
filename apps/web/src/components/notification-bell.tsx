"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read, created_at")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      setUnread(data?.length ?? 0);
      setRecent((data ?? []) as NotificationItem[]);
    }

    load();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setUnread((n) => Math.max(0, n - 1));
    setRecent((prev) => prev.filter((n) => n.id !== id));
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    setUnread(0);
    setRecent([]);
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative",
        )}
        aria-label={t("title")}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-medium">{t("title")}</span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {recent.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("none")}
            </p>
          )}
          {recent.map((n) => (
            <div key={n.id} className="flex gap-2 border-b py-2 last:border-0">
              <div className="flex-1 text-sm">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-muted-foreground">{n.body}</p>}
              </div>
              <button
                onClick={() => markRead(n.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("markRead")}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push("/dashboard/notifications")}
          className="mt-2 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t("title")} →
        </button>
      </PopoverContent>
    </Popover>
  );
}
