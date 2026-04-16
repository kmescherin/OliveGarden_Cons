# Olive Garden Concierge — Platform Hardening Design

**Date:** 2026-04-16  
**Status:** Approved  
**Approach:** Layered Phases (A)

## Context

The OliveGarden_Cons platform is a Next.js 15 + Supabase residential complex management app with 49 planned features. 21 are fully implemented, 7 are partial, 7 are planned but not started, and 14 are new ideas from tenant feedback. The platform has zero tests, unvalidated inputs, partial RLS coverage, and runs on systemd without containerization.

This spec covers making the platform bulletproof: secure, stable, polished, feature-complete for partials, and tested.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Layered phases | Each phase is a stable checkpoint; security first |
| Role system | Keep existing (resident/board/admin) | Already maps to tenant/staff; needs enforcement not restructure |
| Deployment | Docker Compose stack | Reproducible, portable, replaces manual systemd management |
| Testing | Critical path only | Auth, RLS, server actions, key flows — highest ROI |
| UI | Polish existing | Loading states, error boundaries, spacing, accessibility — not a redesign |
| Features | Close partials first | 7 partial features before 14 new feedback features |

## Phase 1: Security + Infrastructure

### 1A. Security Audit and Hardening

#### RLS Verification

Systematically test all 12 tables with SQL queries run as each role (anonymous, resident, board, admin, service_role):

| Table | Expected Behavior |
|-------|-------------------|
| `profiles` | Own row readable; board/admin see all; no insert/update except triggers and own non-moderation fields |
| `user_roles` | Own roles readable; board/admin see all; no direct insert/update by users |
| `audit_log` | Board/admin only; no user access |
| `content_pages` | Public if visibility=public; approved residents see residents-only; board/admin CRUD |
| `social_zones` | Anyone can read; board/admin CRUD |
| `announcements` | Public if visibility=public; approved residents see residents-only; board/admin CRUD |
| `board_members` | Anyone can read; board/admin CRUD |
| `service_types` | Anyone can read; no user write |
| `service_requests` | Own requests readable; board/admin see all; approved residents insert; board update status |
| `knowledge_documents` | Board/admin only |
| `document_chunks` | No client access (service_role only) |
| `suggestions` | Own readable; board/admin see all; approved residents insert; board update status |

Fix any policy gaps discovered during testing.

#### Input Validation with Zod

Add Zod schemas to every server action and API route:

**Server actions requiring schemas:**
- `features/auth/register-form.tsx` — email format, password min 8 chars, full_name (1-200 chars), phone (optional, valid format), block (1-10 chars), apartment (1-10 chars)
- `features/auth/profile-form.tsx` — same field rules, exclude moderation fields
- `features/services/service-request-form.tsx` — service_type_id (UUID), description (1-2000 chars), preferred_at (optional, future date)
- `features/services/service-request-actions.ts` — id (UUID), status (enum values only)
- `features/suggestions/suggestion-form.tsx` — title (1-200 chars), body (1-5000 chars)
- `features/suggestions/suggestion-actions.ts` — id (UUID), status (enum), board_note (optional, 1-1000 chars)
- `features/content/board-content-actions.ts` — title (1-500 chars), body (1-50000 chars), slug (alphanumeric + hyphens), visibility (enum), sort_order (integer >= 0)
- `features/admin/actions.ts` — userId (UUID), role (enum values only), email (valid email)
- `features/board-moderation/actions.ts` — targetUserId (UUID), newStatus (enum), note (optional, 1-1000 chars)
- `api/rag/chat/route.ts` — message (1-2000 chars), max 10 messages per request

**HTML sanitization:** All user-submitted text stored as-is; rendered with React's default JSX escaping (no dangerouslySetInnerHTML). Content pages body field: sanitize on render, strip script tags.

#### Rate Limiting

In-memory sliding window rate limiter (single-instance deployment, no Redis needed):

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/login` | 5 requests | 1 minute per IP |
| `/register` | 3 requests | 1 minute per IP |
| `/auth/callback` | 10 requests | 1 minute per IP |
| `/api/rag/chat` | 20 requests | 1 hour per user |
| Service request creation | 10 requests | 1 hour per user |
| Suggestion creation | 5 requests | 1 hour per user |
| All other POST | 30 requests | 1 minute per IP |

Implementation: Map of `key -> timestamp[]` in a shared module `lib/rate-limit.ts`. Clean entries older than window on each check. State lost on server restart (acceptable — rate limits are transient). Cap map size at 10000 entries, evict oldest when full.

#### Security Headers

Applied via Next.js middleware on all responses:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.openai.com; font-src 'self'; frame-ancestors 'none'
```

CSP allows `unsafe-inline` and `unsafe-eval` for Next.js compatibility (can tighten later with nonce-based CSP).

#### Auth Hardening

- **Session timeout:** Configure Supabase JWT expiry to 24 hours (via `config.toml` or env `GOTRUE_JWT_EXP`)
- **Cookie security:** Verify Supabase SSR client sets `Secure`, `HttpOnly`, `SameSite=Lax`
- **Magic link:** Verify Supabase handles one-time use natively; add rate limiting on magic link requests
- **Password requirements:** Zod schema enforces minimum 8 characters, at least one letter and one number
- **Email verification:** Enable `confirm email` in Supabase config (currently `enable_confirmations = false` — change to `true`)
- **Admin protection:** Verify last-admin guard works; prevent self-role-revocation

### 1B. Docker Compose Infrastructure

#### Next.js Container

Multi-stage Dockerfile:

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/web/ ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

- Non-root user (nextjs)
- Standalone output mode in `next.config.ts`
- Health check endpoint at `/api/health` (returns 200 OK)
- Memory limit: 900MB (matching current systemd)

#### Health Check API Route

New `apps/web/src/app/api/health/route.ts`:
- Returns `{ status: "ok", timestamp }` with 200
- Optionally checks Supabase connectivity

#### Compose Stack

Unified `docker-compose.yml` at project root:

```yaml
services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    env_file: ./apps/web/.env
    deploy:
      resources:
        limits:
          memory: 900M
    depends_on:
      - supabase-kong
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deploy/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    restart: unless-stopped

  # Supabase services — import from deploy/supabase/docker-compose.yml
  # Reference the existing Supabase self-hosted stack via extends or inline
  # Key services: db (Postgres), kong (API gateway), auth (GoTrue),
  # rest (PostgREST), realtime, storage, imgproxy, meta (Studio)
  # See deploy/supabase/docker-compose.yml for full service definitions
  supabase-db:
    extends:
      file: ./deploy/supabase/docker-compose.yml
      service: db
```

- Named volumes for DB persistence
- Shared Docker network
- `.env` template with all variables
- Nginx config includes security headers and proxy buffer sizes (fixes existing 502)

#### Migration Path

1. Build and test Docker Compose locally
2. Deploy to VPS alongside existing systemd setup (different port)
3. Verify all functionality
4. Switch nginx to point to Docker container
5. Remove systemd service

#### Nginx Configuration

New `deploy/nginx/nginx.conf`:
- TLS termination (certs via Let's Encrypt or manual)
- Proxy to Next.js on port 3000
- Supabase paths proxied to Kong
- Security headers (redundant with middleware, belt-and-suspenders)
- Proxy buffer sizes: `proxy_buffer_size 128k; proxy_buffers 4 256k; proxy_busy_buffers_size 256k;` (fixes 502)
- Gzip compression
- Rate limiting at nginx level for auth endpoints (defense in depth)

## Phase 2: Stability + Partial Features

### 2.1. Content Visibility Toggle (5.3)

The `content_pages` table has a `visibility` column (`public`/`residents`) and RLS policies enforce it. The board content editor needs a dropdown to select visibility.

**Changes:**
- `features/content/board-content-forms.tsx` — add `<Select>` for visibility (public/residents) to the content page editor
- Default to `public` for new pages

### 2.2. Announcements — Complete (5.4)

Announcements have a working editor and public page. Missing: visibility selector.

**Changes:**
- `features/content/board-content-forms.tsx` — add visibility selector to announcement editor (same as content pages)
- Verify announcements page filters by visibility

### 2.3. Request Photos (6.4)

The `service_requests.photo_paths` column exists (TEXT[]). Needs Supabase Storage bucket + upload UI.

**New migration:** Create `service-photos` Storage bucket with policies:
- Residents: upload to own folder, read own photos
- Board/admin: read all photos
- Max file size: 5MB per image, max 3 images per request
- Allowed types: image/jpeg, image/png, image/webp

**Changes:**
- `supabase/migrations/` — new migration for Storage bucket and policies
- `features/services/service-request-form.tsx` — add file upload input with preview
- `features/services/board-service-queue.tsx` — display attached photos
- `features/services/service-requests-list.tsx` — display attached photos for own requests
- `types/database.ts` — verify `photo_paths: string[]` type exists

**Upload flow:**
1. User selects files in form (client-side preview)
2. On submit: create service request first (INSERT returns `id`)
3. Upload files to Storage (`service-photos/{user_id}/{request_id}/{index}.{ext}`)
4. UPDATE request to set `photo_paths` with the storage paths
5. If upload fails: request still exists without photos (graceful degradation)
6. Display using Supabase Storage signed URLs (not public — keeps photos private)

### 2.4. Board Service Queue — Status Workflow (6.5-6.6)

The board service queue UI exists but status transitions may not enforce rules.

**Changes:**
- Verify server action `updateServiceRequestStatus` enforces valid transitions: `new → in_progress`, `in_progress → done`, `in_progress → cancelled`, `new → cancelled`
- Add Zod enum validation for status values
- Board queue UI: show current status, dropdown for valid next status only
- Add "Cancel" option with reason (optional)

### 2.5. Document Ingest Pipeline (8.3)

The `knowledge_documents` and `document_chunks` tables exist. The ingest Edge Function is a stub.

**Implementation as Next.js API route** (not Edge Function — needs longer timeout and file system access):

New `apps/web/src/app/api/rag/ingest/route.ts`:
- Accept PDF or text file upload from board user
- Extract text: use `pdf-parse` for PDF, raw for text
- Chunk text: 500-1000 character chunks with 100 char overlap
- Generate embeddings via OpenAI `text-embedding-3-small`
- Insert chunks into `document_chunks` with metadata
- Insert document record into `knowledge_documents`
- Board-only access (verify role server-side)

**Board upload UI:**
- New section in `/board/content` for knowledge base management
- Upload form with file type validation
- List of uploaded documents with delete option
- Delete removes document + associated chunks

### 2.6. Chat Sources (8.5)

The RAG chat API route returns only the answer text.

**Changes:**
- `api/rag/chat/route.ts` — return `sources` array alongside `answer`
- Each source: `{ document_title: string, relevance: number, chunk_preview: string }`
- `features/rag-chat/rag-chat-panel.tsx` — display sources below each answer as collapsible section

### 2.7. Board Suggestion Management

The `updateSuggestionStatus` server action exists but has no board-facing page.

**New page:** `apps/web/src/app/[locale]/board/suggestions/page.tsx`
- List all suggestions with status filters (pending/accepted/rejected)
- Status update form (accept/reject with optional board note)
- Sort by date (newest first)

**Changes:**
- `features/suggestions/suggestion-actions.ts` — verify action is complete
- `types/database.ts` — verify Suggestion type matches schema
- Board layout — add navigation link to suggestions

### 2.8. In-App Notifications (9.3)

New feature — notification center for residents and board.

**New migration:** `notifications` table:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'announcement_new',
    'request_status_changed',
    'suggestion_status_changed'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, read, created_at DESC);
```

**Notification triggers:**
- Board publishes announcement → notification to all approved residents
- Board changes service request status → notification to request owner
- Board updates suggestion status → notification to suggestion owner

Implementation: shared module `features/notifications/create-notification.ts` with exported function `createNotification(userId, type, title, body, entityType?, entityId?)`. Called inline at the end of each board action (moderateProfile, updateServiceRequestStatus, updateSuggestionStatus, announcement CRUD). Not database triggers (keeps logic in app layer for flexibility and type safety).

**UI components:**
- `components/notification-bell.tsx` — bell icon in header with unread count badge
- `features/notifications/notifications-list.tsx` — full notification list with mark-as-read
- New page: `apps/web/src/app/[locale]/dashboard/notifications/page.tsx`
- Dashboard layout — add bell icon and notifications nav link

**Real-time delivery:** Use Supabase Realtime subscription on `notifications` table for instant updates. Client subscribes on dashboard mount, unsubscribes on unmount.

**i18n:** Add Notifications namespace to all 3 locale files.

## Phase 3: UI Polish

### 3.1. Loading States

**Skeleton components** for all data-fetching pages:
- Dashboard cards (skeleton cards while loading profile/data)
- Service requests list (skeleton rows)
- Board service queue (skeleton table)
- Notifications list (skeleton rows)
- Board content editors (skeleton forms)

**Suspense boundaries** at route level:
- Each `page.tsx` that fetches data wraps content in `<Suspense fallback={<Skeleton />}>`

**Form submissions:**
- Disable submit button during action
- Show spinner/loading indicator
- Use `useTransition` or `useFormStatus` for pending state

### 3.2. Error Handling

**Route-level error boundaries:**
- `error.tsx` at each route segment (`dashboard/`, `admin/`, `board/`, `info/`)
- Generic error message with retry button
- Log error details server-side (console.error for now, Sentry later)

**Server action error handling:**
- All actions already return `{ ok: false, error: string }` — verify all callers handle this
- Toast on error (already done via sonner — verify coverage)

**Empty states:**
- Service requests list: "You haven't submitted any requests yet. Create your first request."
- Board service queue: "No pending service requests."
- Notifications: "No notifications."
- Board suggestions: "No suggestions from residents."
- Search/chat: "No documents in the knowledge base yet."

### 3.3. Visual Improvements

**Typography:**
- Consistent heading hierarchy: H1 for page titles, H2 for sections, H3 for subsections
- Body text: text-base for content, text-sm for secondary/captions
- Use Geist font consistently

**Spacing:**
- Standardize section gaps: `space-y-6` for page sections, `space-y-4` for card groups
- Card padding: `p-6` consistently
- Form field gaps: `space-y-4`

**Cards:**
- Consistent hover state: `hover:shadow-md transition-shadow`
- Consistent border: `border border-border`
- Dashboard cards: icon + title + description + link

**Responsive:**
- Mobile: single column for all lists
- Tablet: 2-column grid for cards
- Desktop: 3-4 column grid for cards
- Board content editor: full-width on mobile, side-by-side on desktop

### 3.4. Accessibility

- All `<img>` tags have `alt` attributes
- All `<button>` and `<a>` elements have descriptive text or `aria-label`
- Modal dialogs: focus trap, Escape to close, focus first interactive element on open
- Form inputs: associated `<label>` elements
- Color contrast: verify all text meets WCAG AA (4.5:1 ratio)
- Skip navigation link for keyboard users
- Tab order: logical, visible focus indicators

## Phase 4: Critical Path Testing

### Test Framework

- **Vitest** for unit/integration tests (fast, native ESM, works with Next.js)
- **Testing Library** for component tests
- **@supabase/supabase-js** for RLS tests against local Supabase instance

### 4.1. Auth Flow Tests

Tests run against local Supabase (started via `npx supabase start`):

| Test | Steps | Expected |
|------|-------|----------|
| Register new user | POST /register with valid data | Profile created with status=pending, resident role assigned |
| Login with password | POST /login with correct credentials | Session created, redirect to /pending |
| Approve user | Board calls moderate_profile RPC | Profile status=approved, audit log entry created |
| Access dashboard after approval | GET /dashboard with approved session | 200 OK, dashboard content rendered |
| Reject user | Board calls moderate_profile with rejected | Profile status=rejected |
| Rejected user sees note | GET /pending with rejected session | Rejection note displayed |
| Magic link flow | Request magic link, click link | Session created, redirect to correct page |
| Session expiry | Wait for JWT expiry | Redirected to login |
| Logout | POST logout | Session cleared, redirected to homepage |

### 4.2. RLS Policy Tests

SQL test file that can be run against local Supabase:

For each table, for each role, verify SELECT/INSERT/UPDATE/DELETE permissions:

| Table | Test Count | Key Scenarios |
|-------|-----------|---------------|
| profiles | 4 | Resident sees own only; board sees all; anonymous sees none |
| user_roles | 3 | Resident sees own; board sees all; no direct writes |
| audit_log | 2 | Board sees entries; resident sees nothing |
| content_pages | 4 | Public visible to all; residents-only hidden from anonymous |
| service_requests | 5 | Own requests visible; board sees all; unapproved can't create |
| suggestions | 5 | Own visible; board sees all; status transitions |
| announcements | 3 | Public visible; residents see all; board manages |
| notifications | 3 | Own only; can mark read; no cross-user access |

### 4.3. Server Action Tests

| Action | Tests |
|--------|-------|
| `createServiceRequest` | Valid request created; unapproved user rejected; rate limited |
| `updateServiceRequestStatus` | Valid transitions; invalid transitions rejected; only board can update |
| `submitSuggestion` | Valid submission; unapproved user rejected |
| `updateSuggestionStatus` | Board can accept/reject; resident cannot |
| `moderateProfile` | Approve/reject; audit log written; only board/admin |
| `grantAppRole` | Admin can grant; non-admin cannot; last-admin protection |
| `revokeAppRole` | Admin can revoke; cannot revoke own admin if last |
| Content CRUD | Board can create/update/delete; resident cannot |

### 4.4. Integration Tests

| Flow | Steps |
|------|-------|
| Service request lifecycle | Resident creates → board sees in queue → board changes status → resident sees updated status → notification created |
| Suggestion lifecycle | Resident submits → board sees → board accepts with note → resident sees status |
| Announcement publishing | Board creates announcement → resident sees in list → notification sent |
| Document ingest + chat | Board uploads PDF → chunks created → chat query returns answer with sources |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RLS policy gap found during audit | Medium | Critical | Fix immediately, write test to prevent regression |
| Docker Compose memory pressure on VPS | Medium | High | Memory limits per container, test on target hardware |
| Supabase Storage upload fails | Low | Medium | Fallback: create request without photo, retry upload |
| Notification flood on announcement to many users | Low | Medium | Batch inserts, async processing |
| Rate limiter memory leak | Low | Low | Periodic cleanup, map size cap |
| CSP breaks existing functionality | Medium | Medium | Test thoroughly, use report-only mode first |

## Scope Exclusions

These are explicitly out of scope for this spec and will be addressed separately:

- New feedback features (parking/access, meetings, elections, custom request types) — Phase 2 in product roadmap
- Email notifications (9.1) — requires external service integration
- Web Push (9.2) — requires VAPID keys, service worker changes
- Rich text editor for content pages — current textarea is sufficient
- Sentry/monitoring integration — infrastructure concern for later
- Multi-tenancy / multiple complexes — single complex assumption holds
- Mobile native app — PWA is the mobile strategy

## Success Criteria

1. All 12 tables have verified RLS policies with SQL test coverage
2. All server actions have Zod input validation
3. Rate limiting active on all sensitive endpoints
4. Security headers present on all responses
5. Full Docker Compose stack runs with health checks
6. All 7 partial features closed and functional
7. In-app notifications working with real-time delivery
8. All pages have loading states and error boundaries
9. Critical path tests pass (auth, RLS, server actions, integration)
10. No console errors in production build
