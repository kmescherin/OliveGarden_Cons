# Garden Residence Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Garden Residence visual direction to the Olive Gardens app shell and dashboard surfaces.

**Architecture:** Use global theme tokens and reusable CSS utility classes for the shared visual language, then apply those classes to existing dashboard/admin layouts and pages. Avoid changing data loading or user flows.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, next/font/google, lucide-react.

---

### Task 1: Theme And Motion Foundation

**Files:**
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] Add `Cormorant_Garamond` in the locale layout and expose it as `--font-heading`.
- [ ] Replace the cool Mercury color tokens with Garden Residence tokens.
- [ ] Add reusable classes: `app-shell`, `app-main`, `dashboard-hero`, `dashboard-title`, `dashboard-lead`, `dashboard-panel`, `dashboard-card`, `dashboard-section`, and `dashboard-card-grid`.
- [ ] Add reduced-motion-safe `garden-rise` and card hover animations.

### Task 2: Navigation And Shell Spacing

**Files:**
- Modify: `apps/web/src/components/site-header-client.tsx`
- Modify: `apps/web/src/components/admin-nav.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/layout.tsx`
- Modify: `apps/web/src/app/[locale]/admin/layout.tsx`

- [ ] Restyle the sticky header with the olive glass background and wider shell padding.
- [ ] Convert dashboard nav into a centered pill/ribbon nav with room from screen edges.
- [ ] Convert admin nav to the same visual system.
- [ ] Ensure main dashboard/admin content uses `app-main` instead of raw `container` spacing.

### Task 3: Dashboard Pages

**Files:**
- Modify: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/services/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/suggestions/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/parking/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/chat/page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/notifications/page.tsx`
- Modify: `apps/web/src/app/[locale]/profile/page.tsx`

- [ ] Use `dashboard-hero` for page titles and intro copy.
- [ ] Wrap form/list areas in `dashboard-panel`.
- [ ] Apply `dashboard-card-grid` and `dashboard-card` to landing cards.
- [ ] Keep responsive layouts stable on mobile and desktop.

### Task 4: Verify And Commit

**Commands:**
- `npm run typecheck`
- `npm run audit:error-surfaces`
- `npm run test:error-management`
- `npm run lint`
- `npm run build`
- `$env:BASE_URL='http://localhost:3011'; npm run audit:user-paths`

- [ ] Restart the local dev server on port `3011`.
- [ ] Visually verify `/en/dashboard`, `/en/dashboard/services`, `/en/dashboard/parking`, `/en/profile`, `/en/admin`, and mobile width.
- [ ] Commit only files changed for this restyle and push the feature branch.
