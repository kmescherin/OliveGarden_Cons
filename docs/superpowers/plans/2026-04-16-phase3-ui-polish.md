# Phase 3: UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the UI with loading states, error boundaries, empty states, consistent typography, and accessibility improvements.

**Architecture:** Incremental improvements to existing components. No structural changes — just adding missing UX patterns.

**Tech Stack:** React Suspense, Next.js error boundaries, existing shadcn/ui components.

---

## File Structure

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/components/ui/skeleton.tsx` | Skeleton loading component |
| Create | `src/components/loading-skeletons.tsx` | Reusable skeleton layouts |
| Create | `src/app/[locale]/dashboard/error.tsx` | Dashboard error boundary |
| Create | `src/app/[locale]/admin/error.tsx` | Admin error boundary |
| Create | `src/app/[locale]/board/error.tsx` | Board error boundary |
| Create | `src/app/[locale]/info/error.tsx` | Info error boundary |
| Create | `src/components/empty-state.tsx` | Reusable empty state component |

---

### Task 1: Skeleton Components

**Files:**
- Create: `apps/web/src/components/loading-skeletons.tsx`

- [ ] **Step 1: Install skeleton if needed**

Run: `cd apps/web && npx shadcn@latest add skeleton` (skip if already exists)

- [ ] **Step 2: Create reusable skeleton layouts**

Create `apps/web/src/components/loading-skeletons.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b py-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
      <Skeleton className="h-5 w-1/4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/3" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
```

- [ ] **Step 3: Wrap data-fetching pages in Suspense**

For each page that fetches data, wrap the data-dependent content in `<Suspense>`. Example for dashboard page:

```tsx
import { Suspense } from "react";
import { PageSkeleton } from "@/components/loading-skeletons";

// In the page component:
<Suspense fallback={<PageSkeleton />}>
  {/* data-dependent content */}
</Suspense>
```

Apply to: dashboard home, services page, suggestions page, admin users, board moderation, board services, board content, info pages.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/loading-skeletons.tsx apps/web/src/components/ui/skeleton.tsx
git commit -m "feat: add skeleton loading components and Suspense boundaries"
```

---

### Task 2: Error Boundaries

**Files:**
- Create: `apps/web/src/app/[locale]/dashboard/error.tsx`
- Create: `apps/web/src/app/[locale]/admin/error.tsx`
- Create: `apps/web/src/app/[locale]/board/error.tsx`
- Create: `apps/web/src/app/[locale]/info/error.tsx`

- [ ] **Step 1: Create error boundary for each route segment**

Each `error.tsx` follows this pattern. Create all 4 files with the same structure (title varies):

```tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/*/dashboard/error.tsx apps/web/src/app/*/admin/error.tsx apps/web/src/app/*/board/error.tsx apps/web/src/app/*/info/error.tsx
git commit -m "feat: add error boundaries to dashboard, admin, board, info routes"
```

---

### Task 3: Empty States

**Files:**
- Create: `apps/web/src/components/empty-state.tsx`

- [ ] **Step 1: Create reusable empty state component**

Create `apps/web/src/components/empty-state.tsx`:

```tsx
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Apply empty states to list components**

Add `<EmptyState>` when lists are empty in:
- `features/services/service-requests-list.tsx`
- `features/services/board-service-queue.tsx`
- `features/suggestions/suggestions-list.tsx`
- `features/notifications/notifications-list.tsx`
- `app/[locale]/board/suggestions/page.tsx`

Example usage:
```tsx
import { EmptyState } from "@/components/empty-state";

{items.length === 0 && (
  <EmptyState title="No requests yet" description="Create your first service request" />
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/empty-state.tsx apps/web/src/features/ apps/web/src/app/
git commit -m "feat: add empty state component and apply to all list views"
```

---

### Task 4: Typography and Spacing Consistency

**Files:**
- Modify: Various page and component files

- [ ] **Step 1: Standardize page titles**

All page-level headings should use: `<h1 className="text-2xl font-bold">`

Verify and fix these pages:
- Dashboard home: already has heading pattern
- Services page: ensure `<h1>` exists
- Suggestions page: ensure `<h1>` exists
- Admin pages: ensure `<h1>` exists
- Board pages: ensure `<h1>` exists

- [ ] **Step 2: Standardize card styling**

All dashboard/info cards should use: `rounded-xl border bg-card p-6 hover:shadow-md transition-shadow`

Add `hover:shadow-md transition-shadow` to any cards missing it.

- [ ] **Step 3: Standardize section spacing**

Pages should use `space-y-6` for top-level sections, `space-y-4` for card groups.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "style: standardize typography, spacing, and card hover states"
```

---

### Task 5: Accessibility Fixes

**Files:**
- Modify: Various component files

- [ ] **Step 1: Add aria-labels to icon-only buttons**

In `components/user-menu.tsx`, `components/site-header-client.tsx`, `components/notification-bell.tsx` — verify all icon buttons have `aria-label`.

Already present in some (e.g., `<DropdownMenuTrigger aria-label="Menu">`). Verify all:
- Mobile menu trigger: `aria-label="Menu"` (exists)
- User menu trigger: `aria-label="Account"` (verify)
- Notification bell: `aria-label="Notifications"` (added in Task 4)
- Locale switcher: verify labels exist

- [ ] **Step 2: Add focus management to dialogs/sheets**

In `components/ui/sheet.tsx` and `components/ui/dialog.tsx` — verify Shadcn's default focus trap is working. Shadcn handles this by default via Radix primitives.

- [ ] **Step 3: Verify all form inputs have associated labels**

Check all forms: login, register, profile, service request, suggestion. Each `<Input>`, `<Textarea>`, `<Select>` must have an associated `<Label htmlFor="...">` with matching `id`.

Already done in most forms. Verify service request form has `id="type"` on Select.

- [ ] **Step 4: Add skip navigation link**

In `app/[locale]/layout.tsx`, add a skip link as the first element inside `<body>`:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background">
  Skip to content
</a>
```

And add `id="main-content"` to the main content wrapper.

- [ ] **Step 5: Verify color contrast**

Check that all text meets WCAG AA (4.5:1 ratio). Tailwind's default palette generally meets this. Key areas:
- `text-muted-foreground` on `bg-background` — verify contrast
- Badge text on colored backgrounds
- `text-destructive` on `bg-background`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "a11y: add skip navigation, verify aria-labels and form labels"
```

---

## Verification Checklist

- [ ] `cd apps/web && npx tsc --noEmit` — no errors
- [ ] `cd apps/web && npm run lint` — no errors
- [ ] Navigate between pages — skeletons appear briefly during loading
- [ ] Trigger an error (e.g., bad URL) — error boundary shows with retry button
- [ ] View empty lists — friendly empty state messages
- [ ] Tab through the UI — all interactive elements reachable via keyboard
- [ ] Skip navigation link works (Tab then Enter)
- [ ] No console warnings about missing labels or aria attributes
