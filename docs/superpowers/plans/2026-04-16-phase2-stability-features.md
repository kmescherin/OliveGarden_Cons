# Phase 2: Stability + Partial Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 7 partial features and add in-app notifications for a complete, stable user experience.

**Architecture:** Build on the secure foundation from Phase 1. Each feature follows existing patterns (server actions, RLS, i18n). Notifications use Supabase Realtime for instant delivery.

**Tech Stack:** Supabase Storage (photos), Supabase Realtime (notifications), pdf-parse (document ingest), existing Zod schemas from Phase 1.

---

## File Structure

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/20260416000000_notifications_storage.sql` | Notifications table + Storage bucket |
| Create | `src/features/notifications/create-notification.ts` | Shared notification creation helper |
| Create | `src/components/notification-bell.tsx` | Bell icon with unread count |
| Create | `src/features/notifications/notifications-list.tsx` | Full notification list |
| Create | `src/app/[locale]/dashboard/notifications/page.tsx` | Notifications page |
| Modify | `src/app/[locale]/dashboard/layout.tsx` | Add notification bell + nav link |
| Create | `src/app/[locale]/board/suggestions/page.tsx` | Board suggestion management |
| Modify | `src/components/user-menu.tsx` | Add board suggestions nav |
| Create | `src/app/api/rag/ingest/route.ts` | Document ingest API route |
| Create | `src/features/rag/document-upload-form.tsx` | Board document upload UI |
| Modify | `src/features/rag-chat/rag-chat-panel.tsx` | Display sources |
| Create | `src/features/services/photo-upload.tsx` | Photo upload widget |
| Modify | `src/features/services/service-request-form.tsx` | Integrate photo upload |
| Modify | `src/features/services/board-service-queue.tsx` | Display photos |
| Modify | `src/features/services/service-requests-list.tsx` | Display photos |
| Modify | `src/types/database.ts` | Add Notification type |
| Modify | `messages/{en,ru,tr}.json` | Add all new i18n keys |

---

### Task 1: Notifications + Storage Migration

**Files:**
- Create: `supabase/migrations/20260416000000_notifications_storage.sql`

- [ ] **Step 1: Create migration**

```sql
-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'announcement_new',
    'request_status_changed',
    'suggestion_status_changed'
  )),
  title text not null,
  body text not null default '',
  read boolean not null default false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());

create policy "notifications_insert_own" on public.notifications
  for insert to authenticated with check (user_id = auth.uid());

create index idx_notifications_user_unread
  on public.notifications (user_id, read, created_at desc);

-- Storage bucket for service request photos
insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', false)
on conflict (id) do nothing;

create policy "service_photos_upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'service-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "service_photos_read_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'service-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "service_photos_read_board" on storage.objects
  for select to authenticated using (
    bucket_id = 'service-photos'
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin')
    )
  );

-- Enable Realtime for notifications
alter publication supabase_realtime add table public.notifications;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260416000000_notifications_storage.sql
git commit -m "feat: add notifications table with RLS, Storage bucket for photos, Realtime"
```

---

### Task 2: Update Types and i18n

**Files:**
- Modify: `apps/web/src/types/database.ts`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/ru.json`
- Modify: `apps/web/messages/tr.json`

- [ ] **Step 1: Add Notification type to database.ts**

Append to the end of `types/database.ts`:

```typescript
export type NotificationType = "announcement_new" | "request_status_changed" | "suggestion_status_changed";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Add i18n keys**

Add a `"Notifications"` namespace to each locale file. Example for `en.json`:

```json
"Notifications": {
  "title": "Notifications",
  "markRead": "Mark as read",
  "markAllRead": "Mark all as read",
  "none": "No notifications",
  "announcementNew": "New announcement",
  "requestStatusChanged": "Request status updated",
  "suggestionStatusChanged": "Suggestion status updated"
}
```

For `ru.json`:
```json
"Notifications": {
  "title": "Уведомления",
  "markRead": "Прочитано",
  "markAllRead": "Прочитать все",
  "none": "Нет уведомлений",
  "announcementNew": "Новое объявление",
  "requestStatusChanged": "Статус заявки обновлён",
  "suggestionStatusChanged": "Статус предложения обновлён"
}
```

For `tr.json`:
```json
"Notifications": {
  "title": "Bildirimler",
  "markRead": "Okundu",
  "markAllRead": "Tümünü okundu işaretle",
  "none": "Bildirim yok",
  "announcementNew": "Yeni duyuru",
  "requestStatusChanged": "Talep durumu güncellendi",
  "suggestionStatusChanged": "Öneri durumu güncellendi"
}
```

Also add to the `"Nav"` namespace in all 3 files:
- en: `"notifications": "Notifications"`, `"boardSuggestions": "Suggestions"`
- ru: `"notifications": "Уведомления"`, `"boardSuggestions": "Предложения"`
- tr: `"notifications": "Bildirimler"`, `"boardSuggestions": "Öneriler"`

Add to `"Suggestions"` namespace in all 3 files:
- en: `"boardTitle": "Resident Suggestions"`, `"accept": "Accept"`, `"reject": "Reject"`, `"boardNote": "Board note"`, `"updateStatus": "Update"`
- ru: `"boardTitle": "Предложения жильцов"`, `"accept": "Принять"`, `"reject": "Отклонить"`, `"boardNote": "Комментарий правления"`, `"updateStatus": "Обновить"`
- tr: `"boardTitle": "Site Sakini Önerileri"`, `"accept": "Kabul et"`, `"reject": "Reddet"`, `"boardNote": "Yönetim notu"`, `"updateStatus": "Güncelle"`

Add to `"Content"` namespace for document upload (all 3 files):
- en: `"knowledgeBase": "Knowledge Base"`, `"uploadDocument": "Upload Document"`, `"documents": "Documents"`, `"delete": "Delete"`, `"noDocuments": "No documents uploaded yet"`
- ru: `"knowledgeBase": "База знаний"`, `"uploadDocument": "Загрузить документ"`, `"documents": "Документы"`, `"delete": "Удалить"`, `"noDocuments": "Документы не загружены"`
- tr: `"knowledgeBase": "Bilgi Bankası"`, `"uploadDocument": "Belge Yükle"`, `"documents": "Belgeler"`, `"delete": "Sil"`, `"noDocuments": "Henüz belge yüklenmedi"`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/database.ts apps/web/messages/*.json
git commit -m "feat: add Notification type and i18n keys for Phase 2 features"
```

---

### Task 3: Notification Creation Module

**Files:**
- Create: `apps/web/src/features/notifications/create-notification.ts`

- [ ] **Step 1: Create the notification helper**

```typescript
// apps/web/src/features/notifications/create-notification.ts

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
```

- [ ] **Step 2: Wire notifications into existing board actions**

In `features/services/service-request-actions.ts`, add after the successful status update in `updateServiceRequestStatus`:

After the line `revalidatePath(\`/${locale}/board/services\`);` and before `return { ok: true as const };`, add:

```typescript
  const { data: req } = await supabase
    .from("service_requests")
    .select("user_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (req) {
    const { createNotification } = await import("@/features/notifications/create-notification");
    await createNotification({
      userId: req.user_id,
      type: "request_status_changed",
      title: `Request ${parsed.data.status.replace("_", " ")}`,
      body: `Your service request status has been updated to: ${parsed.data.status}`,
      entityType: "service_request",
      entityId: parsed.data.requestId,
    });
  }
```

In `features/suggestions/suggestion-actions.ts`, add after successful update in `updateSuggestionStatus`:

After `revalidatePath(\`/${locale}/board/suggestions\`);` and before `return`, add:

```typescript
  const { data: sug } = await supabase
    .from("suggestions")
    .select("user_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (sug) {
    const { createNotification } = await import("@/features/notifications/create-notification");
    await createNotification({
      userId: sug.user_id,
      type: "suggestion_status_changed",
      title: `Suggestion ${parsed.data.status}`,
      body: parsed.data.boardNote || undefined,
      entityType: "suggestion",
      entityId: parsed.data.id,
    });
  }
```

In `features/content/board-content-actions.ts`, add to `upsertAnnouncement` after the successful insert:

After `revalidatePath(\`/board/content\`);` and before `return`, add:

```typescript
  if (!parsed.data.id) {
    const { createNotificationForAllResidents } = await import("@/features/notifications/create-notification");
    await createNotificationForAllResidents({
      type: "announcement_new",
      title: parsed.data.title,
      body: parsed.data.body.slice(0, 200),
      entityType: "announcement",
    });
  }
```

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/notifications/ apps/web/src/features/*/actions.ts
git commit -m "feat: add notification creation module, wire into board actions"
```

---

### Task 4: Notification UI — Bell + List + Page

**Files:**
- Create: `apps/web/src/components/notification-bell.tsx`
- Create: `apps/web/src/features/notifications/notifications-list.tsx`
- Create: `apps/web/src/app/[locale]/dashboard/notifications/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/layout.tsx`

- [ ] **Step 1: Create notification bell component**

```tsx
// apps/web/src/components/notification-bell.tsx
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
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setUnread(0);
    setRecent([]);
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
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
            <p className="py-4 text-center text-sm text-muted-foreground">{t("none")}</p>
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
```

Note: If `Popover` component doesn't exist in shadcn/ui setup, install it: `cd apps/web && npx shadcn@latest add popover`.

- [ ] **Step 2: Create notifications list component**

```tsx
// apps/web/src/features/notifications/notifications-list.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";

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
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {items.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-muted-foreground">{t("none")}</p>
      )}
      {items.map((n) => (
        <div
          key={n.id}
          className={cn(
            "rounded-lg border p-4",
            !n.read && "bg-primary/5 border-primary/20",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
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
```

- [ ] **Step 3: Create notifications page**

```tsx
// apps/web/src/app/[locale]/dashboard/notifications/page.tsx
import { setRequestLocale } from "next-intl/server";
import { NotificationsList } from "@/features/notifications/notifications-list";

type Props = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NotificationsList />;
}
```

- [ ] **Step 4: Add notification bell to dashboard layout**

In `apps/web/src/app/[locale]/dashboard/layout.tsx`, add import at top:

```typescript
import { NotificationBell } from "@/components/notification-bell";
```

Then in the JSX, add the bell after the SiteHeader and before the sub-nav div. Replace:

```tsx
<SiteHeader user={user} />
```

With:

```tsx
<SiteHeader user={user} />
```

And add a new nav link for notifications in the sub-nav section, after the suggestions link:

```tsx
<Link
  href="/dashboard/notifications"
  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
>
  {t("notifications")}
</Link>
```

Also add the `<NotificationBell />` component inside the header. Modify the SiteHeader component call to pass a `notificationBell` slot, or add it to `site-header-client.tsx` alongside the user menu.

Simplest approach — add the bell to `components/site-header-client.tsx` in the `authBlock` section, after the UserMenu:

```tsx
import { NotificationBell } from "@/components/notification-bell";
```

Then in the `authBlock` variable, add after `<UserMenu ... />`:

```tsx
<NotificationBell />
```

- [ ] **Step 5: Install popover component if needed**

Run: `cd apps/web && npx shadcn@latest add popover`
Expected: Popover component added to `src/components/ui/popover.tsx`

- [ ] **Step 6: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/notification-bell.tsx apps/web/src/features/notifications/ apps/web/src/app/*/dashboard/notifications/ apps/web/src/app/*/dashboard/layout.tsx apps/web/src/components/site-header-client.tsx
git commit -m "feat: add notification bell, list, page with Supabase Realtime"
```

---

### Task 5: Board Suggestions Page

**Files:**
- Create: `apps/web/src/app/[locale]/board/suggestions/page.tsx`
- Modify: `apps/web/src/components/user-menu.tsx`

- [ ] **Step 1: Create board suggestions page**

```tsx
// apps/web/src/app/[locale]/board/suggestions/page.tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getStaffFlags } from "@/lib/profile";
import { redirect } from "next/navigation";
import { updateSuggestionStatus } from "@/features/suggestions/suggestion-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardSuggestionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Suggestions");
  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    redirect(`/${locale}/admin-required`);
  }

  const supabase = await createClient();
  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("id, title, body, status, board_note, created_at, user_id, profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("boardTitle")}</h1>
      {!suggestions?.length && (
        <p className="text-muted-foreground">{t("none")}</p>
      )}
      {suggestions?.map((s: Record<string, unknown>) => (
        <SuggestionCard
          key={s.id as string}
          id={s.id as string}
          title={s.title as string}
          body={s.body as string | null}
          status={s.status as string}
          boardNote={s.board_note as string | null}
          createdAt={s.created_at as string}
          fullName={((s.profiles as Record<string, string>)?.full_name) ?? "—"}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  id, title, body, status, boardNote, createdAt, fullName, locale, t,
}: {
  id: string; title: string; body: string | null; status: string;
  boardNote: string | null; createdAt: string; fullName: string;
  locale: string; t: Awaited<ReturnType<typeof getTranslations<"Suggestions">>>;
}) {
  async function handleUpdate(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    const note = formData.get("boardNote") as string;
    await updateSuggestionStatus(locale, id, newStatus, note ?? "");
  }

  const statusVariant = status === "accepted" ? "default" : status === "rejected" ? "destructive" : "secondary";

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {fullName} · {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={statusVariant as "default" | "destructive" | "secondary"}>
          {status}
        </Badge>
      </div>
      {body && <p className="text-sm">{body}</p>}
      {boardNote && (
        <p className="text-sm italic text-muted-foreground">
          Board: {boardNote}
        </p>
      )}
      <form action={handleUpdate} className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea name="boardNote" placeholder={t("boardNote")} defaultValue={boardNote ?? ""} rows={2} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" name="status" value="accepted" size="sm" variant="default">
            {t("accept")}
          </Button>
          <Button type="submit" name="status" value="rejected" size="sm" variant="destructive">
            {t("reject")}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Add board suggestions link to user menu**

In `components/user-menu.tsx`, add after the existing board content menu item (after line 81):

```tsx
<DropdownMenuItem onClick={() => router.push("/board/services")}>
  <Wrench className="mr-2 h-4 w-4" />
  {t("boardServices")}
</DropdownMenuItem>
<DropdownMenuItem onClick={() => router.push("/board/suggestions")}>
  <ClipboardList className="mr-2 h-4 w-4" />
  {t("boardSuggestions")}
</DropdownMenuItem>
```

And add `"boardServices": "Service Queue"` (and equivalents) to Nav namespace in all locale files.

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/*/board/suggestions/ apps/web/src/components/user-menu.tsx apps/web/messages/*.json
git commit -m "feat: add board suggestions management page with status updates"
```

---

### Task 6: Photo Upload for Service Requests

**Files:**
- Create: `apps/web/src/features/services/photo-upload.tsx`
- Modify: `apps/web/src/features/services/service-request-form.tsx`
- Modify: `apps/web/src/features/services/board-service-queue.tsx`
- Modify: `apps/web/src/features/services/service-requests-list.tsx`

- [ ] **Step 1: Create photo upload component**

```tsx
// apps/web/src/features/services/photo-upload.tsx
"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const incoming = Array.from(e.target.files ?? []);
    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError("Only JPEG, PNG, WebP allowed");
        return;
      }
      if (f.size > MAX_SIZE) {
        setError("Max 5MB per image");
        return;
      }
    }
    const combined = [...files, ...incoming].slice(0, MAX_FILES);
    onChange(combined);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_FILES}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Add photos ({files.length}/{MAX_FILES})
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative h-16 w-16">
            <img
              src={URL.createObjectURL(f)}
              alt={`Photo ${i + 1}`}
              className="h-16 w-16 rounded object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update service request form to include photo upload**

In `features/services/service-request-form.tsx`, add imports:

```typescript
import { PhotoUpload } from "./photo-upload";
```

Add state after `const [loading, setLoading] = useState(false);`:

```typescript
const [photos, setPhotos] = useState<File[]>([]);
```

In `onSubmit`, after the successful insert and before `setLoading(false)`, add photo upload:

Replace the insert block. Change from:

```typescript
const { error } = await supabase.from("service_requests").insert({...});
setLoading(false);
if (error) { toast.error(error.message); return; }
toast.success("OK");
```

To:

```typescript
const { data: newReq, error } = await supabase
  .from("service_requests")
  .insert({
    user_id: user.id,
    service_type_id: typeId,
    description,
    preferred_at: preferredAt ? new Date(preferredAt).toISOString() : null,
  })
  .select("id")
  .single();

if (error) {
  setLoading(false);
  toast.error(error.message);
  return;
}

if (photos.length > 0 && newReq) {
  const paths: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const ext = photos[i].name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${newReq.id}/${i}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("service-photos")
      .upload(path, photos[i]);
    if (!uploadErr) paths.push(path);
  }
  if (paths.length > 0) {
    await supabase
      .from("service_requests")
      .update({ photo_paths: paths })
      .eq("id", newReq.id);
  }
}

setLoading(false);
setPhotos([]);
toast.success("OK");
```

Add the `<PhotoUpload>` component in the form JSX, before the submit button:

```tsx
<PhotoUpload files={photos} onChange={setPhotos} />
```

- [ ] **Step 3: Display photos in service requests list**

In `features/services/service-requests-list.tsx`, add photo display. After each request's description, add:

```tsx
{req.photo_paths && req.photo_paths.length > 0 && (
  <div className="flex gap-2 mt-2">
    {req.photo_paths.map((path, i) => {
      const { data } = createClient().storage.from("service-photos").getPublicUrl(path);
      return (
        <img key={i} src={data.publicUrl} alt={`Photo ${i+1}`} className="h-16 w-16 rounded object-cover" />
      );
    })}
  </div>
)}
```

Note: Since the bucket is private, use signed URLs instead. Create a helper:

```tsx
async function getPhotoUrls(paths: string[]): Promise<string[]> {
  const supabase = createClient();
  const urls: string[] = [];
  for (const path of paths) {
    const { data } = await supabase.storage.from("service-photos").createSignedUrl(path, 3600);
    if (data) urls.push(data.signedUrl);
  }
  return urls;
}
```

For the server-rendered lists, it's simpler to use the admin client for signed URLs. Alternatively, make the bucket public for read and keep RLS on who can list objects. The RLS policies already handle this — board can read all, residents only their own folder. For simplicity, use signed URLs generated server-side.

- [ ] **Step 4: Display photos in board service queue**

Similar approach in `features/services/board-service-queue.tsx` — use `createAdminClient()` to generate signed URLs for any photo.

- [ ] **Step 5: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/services/
git commit -m "feat: add photo upload for service requests with Storage bucket"
```

---

### Task 7: Content Visibility Toggle

**Files:**
- Modify: `apps/web/src/features/content/board-content-forms.tsx`

- [ ] **Step 1: Add visibility selector to content editors**

The `board-content-forms.tsx` already accepts `visibility` in the action calls. The editor UI needs a dropdown. This is a UI-only change — find the content page editor section and add a `<Select>` for visibility (public/residents) before the save button.

Similarly for the announcement editor, add the same visibility selector.

Since the exact form structure varies, add the Select import from shadcn and a visibility field:

```tsx
<Select value={visibility} onValueChange={(v) => setVisibility(v as "public" | "residents")}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="public">Public</SelectItem>
    <SelectItem value="residents">Residents only</SelectItem>
  </SelectContent>
</Select>
```

Add state variables `const [visibility, setVisibility] = useState<"public" | "residents">(initialVisibility ?? "public");` to each editor that needs it, and pass it to the action call.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/content/board-content-forms.tsx
git commit -m "feat: add visibility selector (public/residents) to content and announcement editors"
```

---

### Task 8: Document Ingest API Route

**Files:**
- Create: `apps/web/src/app/api/rag/ingest/route.ts`

- [ ] **Step 1: Install pdf-parse**

Run: `cd apps/web && npm install pdf-parse && npm install -D @types/pdf-parse`

- [ ] **Step 2: Create ingest route**

```typescript
// apps/web/src/app/api/rag/ingest/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";

export const runtime = "nodejs";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
  }

  let text: string;
  if (file.type === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else if (file.type === "text/plain") {
    text = await file.text();
  } else {
    return NextResponse.json({ error: "Only PDF and text files supported" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "No text extracted from file" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: doc, error: docError } = await admin
    .from("knowledge_documents")
    .insert({ title, created_by: user.id })
    .select("id")
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? "Failed to create document" }, { status: 500 });
  }

  const chunks = chunkText(text);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: chunks,
    }),
  });

  if (!embedRes.ok) {
    await admin.from("knowledge_documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
  }

  const embedJson = (await embedRes.json()) as {
    data?: { embedding: number[] }[];
  };

  const chunkRows = chunks.map((content, i) => ({
    document_id: doc.id,
    content,
    embedding: embedJson.data?.[i]?.embedding ?? null,
    metadata: { document_title: title, chunk_index: i },
  }));

  const { error: insertError } = await admin.from("document_chunks").insert(chunkRows);
  if (insertError) {
    await admin.from("knowledge_documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, documentId: doc.id, chunkCount: chunks.length });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("knowledge_documents").delete().eq("id", documentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/rag/ingest/route.ts apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add document ingest API route with PDF parsing, chunking, embedding"
```

---

### Task 9: Board Document Upload UI

**Files:**
- Create: `apps/web/src/features/rag/document-upload-form.tsx`
- Modify: `apps/web/src/app/[locale]/board/content/page.tsx`

- [ ] **Step 1: Create document upload form**

```tsx
// apps/web/src/features/rag/document-upload-form.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2, FileText } from "lucide-react";

type Doc = { id: string; title: string; created_at: string };

export function DocumentUploadForm({ documents: initialDocs }: { documents: Doc[] }) {
  const t = useTranslations("Content");
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    const res = await fetch("/api/rag/ingest", { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Upload failed");
      return;
    }
    const data = await res.json();
    setDocs((prev) => [{ id: data.documentId, title: title.trim(), created_at: new Date().toISOString() }, ...prev]);
    setTitle("");
    setFile(null);
    toast.success(`Uploaded: ${data.chunkCount} chunks`);
    router.refresh();
  }

  async function onDelete(id: string) {
    const res = await fetch("/api/rag/ingest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id }),
    });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("knowledgeBase")}</h3>
      <form onSubmit={onUpload} className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label>{t("uploadDocument")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" required />
          <Input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <Button type="submit" disabled={loading || !file}>
          <Upload className="mr-2 h-4 w-4" />
          {t("uploadDocument")}
        </Button>
      </form>
      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
      )}
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{d.title}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add document section to board content page**

In `apps/web/src/app/[locale]/board/content/page.tsx`, add a section that fetches `knowledge_documents` and renders `<DocumentUploadForm>`.

Add to the page's data fetching:

```typescript
const { data: documents } = await supabase
  .from("knowledge_documents")
  .select("id, title, created_at")
  .order("created_at", { ascending: false });
```

And add to the JSX:

```tsx
<DocumentUploadForm documents={documents ?? []} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/rag/document-upload-form.tsx apps/web/src/app/*/board/content/page.tsx
git commit -m "feat: add board document upload UI with knowledge base management"
```

---

### Task 10: Chat Sources Display

**Files:**
- Modify: `apps/web/src/features/rag-chat/rag-chat-panel.tsx`

- [ ] **Step 1: Update chat panel to display sources**

The API now returns `{ answer, sources }`. Update the chat panel to handle and display sources.

In the message type, update to include sources:

```typescript
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: { document_title: string; relevance: number; chunk_preview: string }[];
};
```

When receiving the API response, parse `sources`:

```typescript
const data = await res.json();
setMessages((prev) => [
  ...prev,
  {
    role: "assistant",
    content: data.answer,
    sources: data.sources ?? [],
  },
]);
```

In the message rendering, after the answer text, add a collapsible sources section:

```tsx
{msg.sources && msg.sources.length > 0 && (
  <details className="mt-2">
    <summary className="cursor-pointer text-xs text-muted-foreground">Sources ({msg.sources.length})</summary>
    <div className="mt-1 space-y-1">
      {msg.sources.map((s, i) => (
        <div key={i} className="rounded border p-2 text-xs">
          <span className="font-medium">{s.document_title}</span>
          <span className="ml-2 text-muted-foreground">({s.relevance})</span>
          <p className="mt-1 text-muted-foreground">{s.chunk_preview}...</p>
        </div>
      ))}
    </div>
  </details>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/rag-chat/rag-chat-panel.tsx
git commit -m "feat: display source citations in RAG chat responses"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `cd apps/web && npx tsc --noEmit` — no TypeScript errors
- [ ] `cd apps/web && npm run lint` — no ESLint errors
- [ ] Run migration: `cd OliveGarden_Cons && npx supabase db push`
- [ ] Board can create announcement with visibility selector
- [ ] Resident can upload photo with service request
- [ ] Board sees photos in service queue
- [ ] Board can manage suggestions (accept/reject with notes)
- [ ] Notifications appear when board changes request/suggestion status
- [ ] Notification bell shows unread count with real-time updates
- [ ] Board can upload PDF → document appears in list → chat uses it
- [ ] Chat responses show source citations
