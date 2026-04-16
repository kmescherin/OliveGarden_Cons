# Phase 1: Security + Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the platform with input validation, rate limiting, security headers, auth improvements, and containerize everything with Docker Compose.

**Architecture:** Defense-in-depth — validation at the action layer, rate limiting at middleware, security headers on every response, containerized deployment with health checks.

**Tech Stack:** Zod v4 (already installed), Next.js middleware, Docker multi-stage builds, Nginx reverse proxy.

---

## File Structure

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/rate-limit.ts` | In-memory sliding window rate limiter |
| Create | `src/lib/validations.ts` | Zod schemas for all server actions |
| Modify | `src/middleware.ts` | Add security headers + rate limiting |
| Modify | `src/features/admin/actions.ts` | Add Zod validation |
| Modify | `src/features/board-moderation/actions.ts` | Add Zod validation |
| Modify | `src/features/content/board-content-actions.ts` | Add Zod validation |
| Modify | `src/features/services/service-request-actions.ts` | Add Zod validation + rate limiting |
| Modify | `src/features/suggestions/suggestion-actions.ts` | Add Zod validation |
| Modify | `src/app/api/rag/chat/route.ts` | Add Zod validation + rate limiting |
| Modify | `supabase/config.toml` | Auth hardening (password policy, JWT expiry) |
| Create | `src/app/api/health/route.ts` | Health check endpoint |
| Modify | `apps/web/next.config.ts` | Enable standalone output for Docker |
| Create | `Dockerfile` | Multi-stage Next.js container (at `apps/web/Dockerfile`) |
| Create | `docker-compose.yml` | Full stack at project root |
| Create | `deploy/nginx/nginx.conf` | Nginx config with security headers + proxy buffers |
| Create | `.env.docker.example` | Template for Docker env vars |

All paths relative to `apps/web/src/` unless noted. Project root is `OliveGarden_Cons/`.

---

### Task 1: Rate Limiter Module

**Files:**
- Create: `apps/web/src/lib/rate-limit.ts`

- [ ] **Step 1: Create the rate limiter module**

```typescript
// apps/web/src/lib/rate-limit.ts

type RateLimitRule = {
  limit: number;
  windowMs: number;
};

const store = new Map<string, number[]>();
const MAX_STORE_SIZE = 10000;

function cleanup(key: string, now: number, windowMs: number) {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - windowMs;
  const filtered = timestamps.filter((t) => t > cutoff);
  if (filtered.length === 0) {
    store.delete(key);
  } else {
    store.set(key, filtered);
  }
}

export function checkRateLimit(key: string, rule: RateLimitRule): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanup(key, now, rule.windowMs);

  if (store.size >= MAX_STORE_SIZE && !store.has(key)) {
    const oldest = [...store.entries()].sort((a, b) => a[1][0] - b[1][0]);
    if (oldest.length > 0) store.delete(oldest[0][0]);
  }

  const timestamps = store.get(key) ?? [];
  const allowed = timestamps.length < rule.limit;
  if (allowed) {
    timestamps.push(now);
    store.set(key, timestamps);
  }
  return { allowed, remaining: Math.max(0, rule.limit - timestamps.length - (allowed ? 0 : 0)) };
}

export const RATE_LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },
  register: { limit: 3, windowMs: 60_000 },
  serviceRequest: { limit: 10, windowMs: 3_600_000 },
  suggestion: { limit: 5, windowMs: 3_600_000 },
  ragChat: { limit: 20, windowMs: 3_600_000 },
  apiDefault: { limit: 30, windowMs: 60_000 },
} as const;

export function rateLimitedResponse(limitType: keyof typeof RATE_LIMITS) {
  return { ok: false as const, error: `rate_limited:${limitType}` };
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit src/lib/rate-limit.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/rate-limit.ts
git commit -m "feat: add in-memory sliding window rate limiter module"
```

---

### Task 2: Zod Validation Schemas

**Files:**
- Create: `apps/web/src/lib/validations.ts`

- [ ] **Step 1: Create validation schemas**

```typescript
// apps/web/src/lib/validations.ts

import { z } from "zod";

export const profileDataSchema = z.object({
  full_name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().default(""),
  block: z.string().min(1).max(10),
  apartment: z.string().min(1).max(10),
});

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
}).merge(profileDataSchema);

export const moderateProfileSchema = z.object({
  targetUserId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional().default(""),
});

export const serviceRequestSchema = z.object({
  service_type_id: z.string().uuid(),
  description: z.string().min(1).max(2000),
  preferred_at: z.string().optional().nullable(),
});

export const updateServiceStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["new", "in_progress", "done", "cancelled"]),
});

export const suggestionSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().default(""),
});

export const updateSuggestionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "accepted", "rejected"]),
  boardNote: z.string().max(1000).optional().default(""),
});

export const contentPageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  body: z.string().max(50000),
  visibility: z.enum(["public", "residents"]),
});

export const socialZoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  schedule: z.string().max(200).optional().default(""),
  sort_order: z.number().int().min(0),
});

export const announcementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  body: z.string().max(50000).optional().default(""),
  visibility: z.enum(["public", "residents"]),
});

export const deleteByIdSchema = z.object({
  id: z.string().uuid(),
});

export const boardMemberSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  role_title: z.string().max(200).optional().default(""),
  phone: z.string().max(50).optional().default(""),
  email: z.string().max(320).optional().default(""),
  sort_order: z.number().int().min(0),
});

export const grantRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["board", "admin"]),
});

export const grantRoleByEmailSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["board", "admin"]),
});

export const ragChatSchema = z.object({
  question: z.string().min(1).max(2000),
});
```

- [ ] **Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit src/lib/validations.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/validations.ts
git commit -m "feat: add Zod validation schemas for all server actions"
```

---

### Task 3: Security Headers in Middleware

**Files:**
- Modify: `apps/web/src/middleware.ts`

- [ ] **Step 1: Add security headers to middleware**

Replace the entire content of `apps/web/src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

function rewriteRedirectToPublicSite(response: NextResponse, siteUrlRaw: string | undefined) {
  if (!siteUrlRaw) return;
  const siteBase = siteUrlRaw.endsWith("/") ? siteUrlRaw : `${siteUrlRaw}/`;
  const loc = response.headers.get("location");
  if (!loc) return;
  let parsed: URL;
  try {
    parsed = new URL(loc, siteBase);
  } catch {
    return;
  }
  const loopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]";
  if (!loopback) return;
  const fixed = new URL(parsed.pathname + parsed.search + parsed.hash, siteBase);
  response.headers.set("location", fixed.toString());
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  rewriteRedirectToPublicSite(response, process.env.NEXT_PUBLIC_SITE_URL);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return withSecurityHeaders(response);
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return withSecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add security headers (X-Content-Type-Options, X-Frame-Options, etc.)"
```

---

### Task 4: Apply Validation to Server Actions

**Files:**
- Modify: `apps/web/src/features/board-moderation/actions.ts`
- Modify: `apps/web/src/features/services/service-request-actions.ts`
- Modify: `apps/web/src/features/suggestions/suggestion-actions.ts`
- Modify: `apps/web/src/features/content/board-content-actions.ts`
- Modify: `apps/web/src/features/admin/actions.ts`

- [ ] **Step 1: Add validation to board-moderation/actions.ts**

Replace entire file:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateProfileSchema } from "@/lib/validations";

export async function moderateProfile(
  locale: string,
  targetUserId: string,
  status: "approved" | "rejected",
  note: string | null,
) {
  const parsed = moderateProfileSchema.safeParse({
    targetUserId,
    status,
    note: note ?? "",
  });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  if (parsed.data.status === "rejected" && !parsed.data.note) {
    return { ok: false as const, error: "reject_requires_note" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_profile", {
    target_user_id: parsed.data.targetUserId,
    new_status: parsed.data.status,
    note: parsed.data.note,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/board/moderation`);
  return { ok: true as const };
}
```

- [ ] **Step 2: Add validation to service-request-actions.ts**

Replace entire file:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaffFlags } from "@/lib/profile";
import { serviceRequestSchema, updateServiceStatusSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";

export async function updateServiceRequestStatus(
  locale: string,
  requestId: string,
  status: "new" | "in_progress" | "done" | "cancelled",
) {
  const parsed = updateServiceStatusSchema.safeParse({ requestId, status });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return { ok: false as const, error: "forbidden" };
  }

  const { data: current } = await (await createClient())
    .from("service_requests")
    .select("status")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (current) {
    const validTransitions: Record<string, string[]> = {
      new: ["in_progress", "cancelled"],
      in_progress: ["done", "cancelled"],
    };
    const allowed = validTransitions[current.status];
    if (allowed && !allowed.includes(parsed.data.status)) {
      return { ok: false as const, error: "invalid_transition" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.requestId);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/services`);
  revalidatePath(`/${locale}/board/services`);
  return { ok: true as const };
}

export async function createServiceRequest(
  locale: string,
  userId: string,
  formData: { service_type_id: string; description: string; preferred_at: string | null },
) {
  const rl = checkRateLimit(`sr:${userId}`, RATE_LIMITS.serviceRequest);
  if (!rl.allowed) return rateLimitedResponse("serviceRequest");

  const parsed = serviceRequestSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("service_requests").insert({
    user_id: userId,
    service_type_id: parsed.data.service_type_id,
    description: parsed.data.description,
    preferred_at: parsed.data.preferred_at ?? null,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/services`);
  return { ok: true as const };
}
```

- [ ] **Step 3: Add validation to suggestion-actions.ts**

Replace entire file:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { suggestionSchema, updateSuggestionStatusSchema } from "@/lib/validations";

export async function submitSuggestion(
  locale: string,
  title: string,
  body: string,
) {
  const parsed = suggestionSchema.safeParse({ title, body });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const rl = checkRateLimit(`sug:${user.id}`, RATE_LIMITS.suggestion);
  if (!rl.allowed) return rateLimitedResponse("suggestion");

  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    title: parsed.data.title.trim(),
    body: parsed.data.body.trim() || null,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/suggestions`);
  return { ok: true as const };
}

export async function updateSuggestionStatus(
  locale: string,
  id: string,
  status: string,
  boardNote: string,
) {
  const parsed = updateSuggestionStatusSchema.safeParse({ id, status, boardNote });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({
      status: parsed.data.status,
      board_note: parsed.data.boardNote.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/dashboard/suggestions`);
  revalidatePath(`/${locale}/board/suggestions`);
  return { ok: true as const };
}
```

- [ ] **Step 4: Add validation to board-content-actions.ts**

Replace entire file:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  contentPageSchema,
  socialZoneSchema,
  announcementSchema,
  deleteByIdSchema,
  boardMemberSchema,
} from "@/lib/validations";

export async function upsertContentPage(values: {
  slug: string;
  title: string;
  body: string;
  visibility: "public" | "residents";
}) {
  const parsed = contentPageSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("content_pages").upsert(
    {
      slug: parsed.data.slug,
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertSocialZone(values: {
  id?: string;
  name: string;
  description: string;
  schedule: string;
  sort_order: number;
}) {
  const parsed = socialZoneSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const row = {
    name: parsed.data.name,
    description: parsed.data.description,
    schedule: parsed.data.schedule,
    sort_order: parsed.data.sort_order,
  };
  const { error } = parsed.data.id
    ? await supabase.from("social_zones").update(row).eq("id", parsed.data.id)
    : await supabase.from("social_zones").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/zones");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertAnnouncement(values: {
  id?: string;
  title: string;
  body: string;
  visibility: "public" | "residents";
}) {
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const row = {
    title: parsed.data.title,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
  };
  const { error } = parsed.data.id
    ? await supabase.from("announcements").update(row).eq("id", parsed.data.id)
    : await supabase.from("announcements").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/announcements");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const parsed = deleteByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", parsed.data.id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/announcements");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function upsertBoardMember(values: {
  id?: string;
  full_name: string;
  role_title: string;
  phone: string;
  email: string;
  sort_order: number;
}) {
  const parsed = boardMemberSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const row = {
    full_name: parsed.data.full_name,
    role_title: parsed.data.role_title,
    phone: parsed.data.phone,
    email: parsed.data.email,
    sort_order: parsed.data.sort_order,
  };
  const { error } = parsed.data.id
    ? await supabase.from("board_members").update(row).eq("id", parsed.data.id)
    : await supabase.from("board_members").insert(row);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}

export async function deleteBoardMember(id: string) {
  const parsed = deleteByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("board_members").delete().eq("id", parsed.data.id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/info/board");
  revalidatePath("/board/content");
  return { ok: true as const };
}
```

- [ ] **Step 5: Add validation to admin/actions.ts**

Replace entire file:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";
import { grantRoleSchema, grantRoleByEmailSchema } from "@/lib/validations";
import type { AppRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

async function assertAdmin() {
  const f = await getStaffFlags();
  if (!f.admin) {
    throw new Error("forbidden");
  }
}

async function listAuthUsersPages(): Promise<User[]> {
  const admin = createAdminClient();
  const out: User[] = [];
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < perPage) break;
    if (!data.nextPage) break;
    page = data.nextPage;
  }
  return out;
}

async function countAdmins(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count ?? 0;
}

export async function grantAppRole(
  locale: string,
  userId: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  const parsed = grantRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("user_roles").insert({ user_id: parsed.data.userId, role: parsed.data.role });
  if (error) {
    if (error.code === "23505") {
      return { ok: true as const };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true as const };
}

export async function revokeAppRole(
  locale: string,
  userId: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  const parsed = grantRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  if (parsed.data.role === "admin") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === parsed.data.userId) {
      const n = await countAdmins();
      if (n <= 1) {
        return { ok: false as const, error: "last_admin" };
      }
    }
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", parsed.data.userId)
    .eq("role", parsed.data.role);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/${locale}/admin/users`);
  return { ok: true as const };
}

export async function grantRoleByEmail(
  locale: string,
  email: string,
  role: Extract<AppRole, "board" | "admin">,
) {
  const parsed = grantRoleByEmailSchema.safeParse({ email, role });
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_input" };
  }
  try {
    await assertAdmin();
  } catch {
    return { ok: false as const, error: "forbidden" };
  }
  const normalized = parsed.data.email.trim().toLowerCase();
  let users: User[];
  try {
    users = await listAuthUsersPages();
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "list_users_failed",
    };
  }
  const u = users.find((x) => (x.email ?? "").toLowerCase() === normalized);
  if (!u) {
    return { ok: false as const, error: "user_not_found" };
  }
  return grantAppRole(locale, u.id, parsed.data.role);
}

export async function loadAdminUsersForPage() {
  await assertAdmin();
  const adminDb = createAdminClient();
  const [authUsers, rolesRes, profilesRes] = await Promise.all([
    listAuthUsersPages(),
    adminDb.from("user_roles").select("user_id, role"),
    adminDb.from("profiles").select("*"),
  ]);
  if (rolesRes.error) throw rolesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  const rolesByUser = new Map<string, AppRole[]>();
  for (const row of rolesRes.data ?? []) {
    const uid = row.user_id as string;
    const list = rolesByUser.get(uid) ?? [];
    list.push(row.role as AppRole);
    rolesByUser.set(uid, list);
  }
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );
  return authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    profile: profileById.get(u.id) ?? null,
    roles: rolesByUser.get(u.id) ?? [],
  }));
}
```

- [ ] **Step 6: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/*/actions.ts
git commit -m "feat: add Zod validation to all server actions + rate limiting on service requests and suggestions"
```

---

### Task 5: Validate RAG Chat API Route

**Files:**
- Modify: `apps/web/src/app/api/rag/chat/route.ts`

- [ ] **Step 1: Add validation and rate limiting to chat route**

Replace entire file:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ragChatSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(`rag:${user.id}`, RATE_LIMITS.ragChat);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited:ragChat" }, { status: 429 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ragChatSchema.safeParse({ question: body.question?.trim() });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const question = parsed.data.question;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({
      answer:
        "[Demo] Configure OPENAI_API_KEY and ingest documents. Question was: " +
        question.slice(0, 200),
      sources: [],
    });
  }

  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: question,
    }),
  });

  if (!embedRes.ok) {
    const err = await embedRes.text();
    return NextResponse.json(
      { error: "Embedding failed", detail: err },
      { status: 502 },
    );
  }

  const embedJson = (await embedRes.json()) as {
    data?: { embedding: number[] }[];
  };
  const embedding = embedJson.data?.[0]?.embedding;
  if (!embedding?.length) {
    return NextResponse.json(
      { error: "No embedding returned" },
      { status: 502 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({
      answer:
        question +
        " — (Set SUPABASE_SERVICE_ROLE_KEY for vector search + LLM synthesis.)",
      sources: [],
    });
  }

  const { data: chunks, error: rpcError } = await admin.rpc(
    "match_document_chunks",
    {
      query_embedding: embedding,
      match_count: 8,
    },
  );

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: 500 },
    );
  }

  const typedChunks = (chunks as { id: string; content: string; metadata: Record<string, unknown>; similarity: number }[] | null) ?? [];

  const context = typedChunks.map((c) => c.content).join("\n---\n");

  const sources = typedChunks.map((c) => ({
    document_title: (c.metadata?.document_title as string) ?? "Unknown",
    relevance: Math.round(c.similarity * 100) / 100,
    chunk_preview: c.content.slice(0, 150),
  }));

  const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer only using the CONTEXT. If missing, say you do not have that information. Respond in the same language as the user. Site concierge — not legal advice.",
        },
        {
          role: "user",
          content: `CONTEXT:\n${context || "(empty)"}\n\nQUESTION:\n${question}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!chatRes.ok) {
    const err = await chatRes.text();
    return NextResponse.json(
      { error: "LLM failed", detail: err },
      { status: 502 },
    );
  }

  const chatJson = (await chatRes.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = chatJson.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ answer, sources });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/rag/chat/route.ts
git commit -m "feat: add Zod validation + rate limiting + source display to RAG chat"
```

---

### Task 6: Auth Config Hardening

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: Update auth settings in config.toml**

Find and change these values in `supabase/config.toml`:

Change `jwt_expiry = 3600` to:
```toml
jwt_expiry = 86400
```

Change `minimum_password_length = 6` to:
```toml
minimum_password_length = 8
```

Change `password_requirements = ""` to:
```toml
password_requirements = "letters_digits"
```

Change `enable_confirmations = false` to:
```toml
enable_confirmations = true
```

Change `secure_password_change = false` to:
```toml
secure_password_change = true
```

- [ ] **Step 2: Commit**

```bash
git add supabase/config.toml
git commit -m "feat: harden auth config — JWT 24h, 8-char password with letters+digits, email confirmation"
```

---

### Task 7: Health Check API Route

**Files:**
- Create: `apps/web/src/app/api/health/route.ts`

- [ ] **Step 1: Create health check endpoint**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

- [ ] **Step 2: Verify**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/health/route.ts
git commit -m "feat: add /api/health endpoint for Docker health checks"
```

---

### Task 8: Dockerfile for Next.js

**Files:**
- Modify: `apps/web/next.config.ts` — add `output: "standalone"`
- Create: `apps/web/Dockerfile`
- Create: `apps/web/.dockerignore`

- [ ] **Step 1: Enable standalone output in next.config.ts**

Replace entire file:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
});

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: [
        "olivegarden.ruimiranda.com",
        "www.olivegarden.ruimiranda.com",
        "localhost",
      ],
    },
    webpackMemoryOptimizations: true,
  },
};

export default withPWA(withNextIntl(nextConfig));
```

- [ ] **Step 2: Create .dockerignore**

```
node_modules
.next
.git
*.md
.env*
```

- [ ] **Step 3: Create Dockerfile**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

- [ ] **Step 4: Verify Docker build**

Run: `cd apps/web && docker build -t olivegarden-web .`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/web/Dockerfile apps/web/.dockerignore apps/web/next.config.ts
git commit -m "feat: add Dockerfile with multi-stage build, standalone output, health check"
```

---

### Task 9: Docker Compose + Nginx

**Files:**
- Create: `docker-compose.yml` (project root)
- Create: `deploy/nginx/nginx.conf`
- Create: `.env.docker.example` (project root)

- [ ] **Step 1: Create nginx configuration**

```nginx
upstream nextjs {
    server web:3000;
}

upstream supabase_kong {
    server kong:8000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    large_client_header_buffers 4 16k;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location /auth/v1/ {
        proxy_pass http://supabase_kong/auth/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /rest/v1/ {
        proxy_pass http://supabase_kong/rest/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /realtime/v1/ {
        proxy_pass http://supabase_kong/realtime/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /storage/v1/ {
        proxy_pass http://supabase_kong/storage/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }

    location /functions/v1/ {
        proxy_pass http://supabase_kong/functions/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://nextjs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- [ ] **Step 2: Create docker-compose.yml**

This compose file adds the Next.js app and Nginx on top of the existing `deploy/supabase/docker-compose.yml`. Run with:
`docker compose -f docker-compose.yml -f deploy/supabase/docker-compose.yml up -d`

```yaml
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    env_file: ./apps/web/.env
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 900M
    depends_on:
      - kong
    restart: unless-stopped
    networks:
      - supabase-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./deploy/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    restart: unless-stopped
    networks:
      - supabase-network

networks:
  supabase-network:
    external: true
```

Before first run, create the shared network:
```bash
docker network create supabase-network
```

And add `networks: [supabase-network]` to each service in `deploy/supabase/docker-compose.yml` (or set the default network name via `COMPOSE_PROJECT_NAME`).

Alternative simpler approach: copy the entire `deploy/supabase/docker-compose.yml` and add web + nginx services directly. This avoids network issues but requires keeping versions in sync.

```yaml
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    env_file: ./apps/web/.env
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 900M
    depends_on:
      - studio
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./deploy/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    restart: unless-stopped
```

Then merge with the existing Supabase compose:
```bash
docker compose -f docker-compose.yml -f deploy/supabase/docker-compose.yml up -d
```

- [ ] **Step 3: Create .env.docker.example**

```env
POSTGRES_PASSWORD=your-postgres-password
JWT_SECRET=your-jwt-secret-min-32-chars
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key
SECRET_KEY_BASE=your-secret-key-base-min-64-chars
SITE_URL=https://your-domain.com
SUPABASE_PUBLIC_URL=https://your-domain.com
API_EXTERNAL_URL=https://your-domain.com
ADDITIONAL_REDIRECT_URLS=https://your-domain.com
JWT_EXPIRY=86400

SMTP_ADMIN_EMAIL=admin@your-domain.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=OliveGarden

MAILER_URLPATHS_INVITE=/auth/v1/verify
MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
MAILER_URLPATHS_RECOVERY=/auth/v1/verify
MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify

STUDIO_DEFAULT_ORGANIZATION_NAME=OliveGarden
STUDIO_DEFAULT_PROJECT_NAME=OliveGarden
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml deploy/nginx/ .env.docker.example
git commit -m "feat: add Docker Compose stack with Nginx, Supabase services, health checks"
```

---

### Task 10: Registration Password Validation (Client-Side)

**Files:**
- Modify: `apps/web/src/features/auth/register-form.tsx`

- [ ] **Step 1: Add client-side password validation**

In `register-form.tsx`, find the `onSubmit` function and add validation before the Supabase call. Insert after `setLoading(true);` (line 28) and before the `const supabase = createClient();` (line 29):

```typescript
    setLoading(true);
    if (form.password.length < 8) {
      toast.error(t("passwordTooShort"));
      setLoading(false);
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      toast.error(t("passwordRequirements"));
      setLoading(false);
      return;
    }
    const supabase = createClient();
```

This adds early client-side feedback before the server rejects it.

- [ ] **Step 2: Add translation keys**

Add to `apps/web/messages/en.json` under `"Auth"`:
```json
"passwordTooShort": "Password must be at least 8 characters",
"passwordRequirements": "Password must contain letters and numbers"
```

Add to `apps/web/messages/ru.json` under `"Auth"`:
```json
"passwordTooShort": "Пароль должен содержать минимум 8 символов",
"passwordRequirements": "Пароль должен содержать буквы и цифры"
```

Add to `apps/web/messages/tr.json` under `"Auth"`:
```json
"passwordTooShort": "Şifre en az 8 karakter olmalıdır",
"passwordRequirements": "Şifre harf ve rakam içermelidir"
```

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/register-form.tsx apps/web/messages/*.json
git commit -m "feat: add client-side password validation on registration"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `cd apps/web && npx tsc --noEmit` — no TypeScript errors
- [ ] `cd apps/web && npm run lint` — no ESLint errors
- [ ] `cd apps/web && npm run build` — build succeeds with standalone output
- [ ] `docker build -t olivegarden-web apps/web/` — Docker image builds
- [ ] `docker compose config` — compose file validates
- [ ] Visit `/api/health` — returns `{"status":"ok",...}`
- [ ] Check browser dev tools → response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] Try registering with a 4-character password — rejected
- [ ] Try submitting empty service request — rejected by Zod
