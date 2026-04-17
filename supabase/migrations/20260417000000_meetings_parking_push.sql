-- ============================================================
-- Feature Group: Meetings (3.6-3.8), Elections (3.9),
--   Parking/Access (7.2-7.4), Web Push (9.2)
-- ============================================================

-- -----------------------------------------------------------
-- 1. Meetings
-- -----------------------------------------------------------

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  meeting_type text not null default 'regular'
    check (meeting_type in ('regular', 'extraordinary', 'annual')),
  scheduled_at timestamptz not null,
  location text,
  agenda text,
  minutes text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "meetings_read" on public.meetings
  for select to authenticated using (true);

create policy "meetings_board_insert" on public.meetings
  for insert to authenticated with check (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "meetings_board_update" on public.meetings
  for update to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "meetings_board_delete" on public.meetings
  for delete to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

-- -----------------------------------------------------------
-- 2. Decisions (Book of Decisions — 3.6)
-- -----------------------------------------------------------

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings (id) on delete cascade,
  title text not null,
  description text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.decisions enable row level security;

create policy "decisions_read" on public.decisions
  for select to authenticated using (true);

create policy "decisions_board_insert" on public.decisions
  for insert to authenticated with check (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "decisions_board_update" on public.decisions
  for update to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "decisions_board_delete" on public.decisions
  for delete to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

-- -----------------------------------------------------------
-- 3. Election Candidates (3.9)
-- -----------------------------------------------------------

create table if not exists public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  program text,
  photo_path text,
  election_year int not null default extract(year from now()),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.election_candidates enable row level security;

create policy "candidates_read" on public.election_candidates
  for select to authenticated using (true);

create policy "candidates_board_insert" on public.election_candidates
  for insert to authenticated with check (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "candidates_board_update" on public.election_candidates
  for update to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "candidates_board_delete" on public.election_candidates
  for delete to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

-- -----------------------------------------------------------
-- 4. Vehicles (7.2 — temp + permanent)
-- -----------------------------------------------------------

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plate_number text not null,
  vehicle_description text,
  is_temporary boolean not null default false,
  valid_from date,
  valid_until date,
  status text not null default 'active'
    check (status in ('active', 'expired', 'removed')),
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

create policy "vehicles_read_own" on public.vehicles
  for select to authenticated using (user_id = auth.uid());

create policy "vehicles_read_board" on public.vehicles
  for select to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated with check (user_id = auth.uid());

create policy "vehicles_update_own" on public.vehicles
  for update to authenticated using (user_id = auth.uid());

create policy "vehicles_delete_own" on public.vehicles
  for delete to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------
-- 5. Guest Passes (7.3)
-- -----------------------------------------------------------

create table if not exists public.guest_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guest_name text not null,
  pass_type text not null default 'pedestrian'
    check (pass_type in ('car', 'pedestrian')),
  plate_number text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text not null default 'active'
    check (status in ('pending', 'active', 'used', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.guest_passes enable row level security;

create policy "guest_passes_read_own" on public.guest_passes
  for select to authenticated using (user_id = auth.uid());

create policy "guest_passes_read_board" on public.guest_passes
  for select to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "guest_passes_insert_own" on public.guest_passes
  for insert to authenticated with check (user_id = auth.uid());

create policy "guest_passes_update_own" on public.guest_passes
  for update to authenticated using (user_id = auth.uid());

create policy "guest_passes_delete_own" on public.guest_passes
  for delete to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------
-- 6. Key / Fob Management (7.4)
-- -----------------------------------------------------------

create table if not exists public.key_fobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key_type text not null
    check (key_type in ('entrance', 'parking', 'storage', 'mail', 'other')),
  identifier text not null,
  issued_at timestamptz not null default now(),
  status text not null default 'issued'
    check (status in ('issued', 'returned', 'lost')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.key_fobs enable row level security;

create policy "key_fobs_read_own" on public.key_fobs
  for select to authenticated using (user_id = auth.uid());

create policy "key_fobs_read_board" on public.key_fobs
  for select to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "key_fobs_board_insert" on public.key_fobs
  for insert to authenticated with check (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "key_fobs_board_update" on public.key_fobs
  for update to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

create policy "key_fobs_board_delete" on public.key_fobs
  for delete to authenticated using (
    exists (select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('board', 'admin'))
  );

-- -----------------------------------------------------------
-- 7. Push Subscriptions (9.2 — Web Push)
-- -----------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subs_own" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------
-- 8. Extend notification types
-- -----------------------------------------------------------

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'announcement_new',
    'request_status_changed',
    'suggestion_status_changed',
    'meeting_scheduled',
    'decision_published',
    'guest_pass_status_changed'
  ));

-- -----------------------------------------------------------
-- 9. Indexes
-- -----------------------------------------------------------

create index idx_meetings_scheduled on public.meetings (scheduled_at desc);
create index idx_decisions_meeting on public.decisions (meeting_id);
create index idx_vehicles_user on public.vehicles (user_id, status);
create index idx_guest_passes_user on public.guest_passes (user_id, status);
create index idx_key_fobs_user on public.key_fobs (user_id);
create index idx_push_subs_user on public.push_subscriptions (user_id);
