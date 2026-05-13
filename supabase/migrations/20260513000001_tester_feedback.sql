-- Tester / user feedback box: residents and testers report bugs, wishes,
-- and questions about the app itself (distinct from public.suggestions,
-- which is resident-to-board content about the building).

create table if not exists public.tester_feedback (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'bug',
  severity text not null default 'normal',
  title text not null,
  description text,
  page_url text,
  user_agent text,
  status text not null default 'new',
  admin_note text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

-- Extra FK to public.profiles so PostgREST can resolve the
-- `tester_feedback?select=...,profiles(full_name)` join on the board page.
-- (The auth.users FK above keeps cascade behavior intact; profiles.id is
-- itself a PK referencing auth.users.id, so this is a second pointer to the
-- same row.)
alter table public.tester_feedback
  drop constraint if exists tester_feedback_user_profile_fkey;
alter table public.tester_feedback
  add constraint tester_feedback_user_profile_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- Constrain enum-ish columns with check constraints (keeps migrations simple,
-- mirrors the existing suggestions pattern).
alter table public.tester_feedback
  drop constraint if exists tester_feedback_category_check;
alter table public.tester_feedback
  add constraint tester_feedback_category_check
  check (category in ('bug', 'feature', 'question', 'other'));

alter table public.tester_feedback
  drop constraint if exists tester_feedback_severity_check;
alter table public.tester_feedback
  add constraint tester_feedback_severity_check
  check (severity in ('low', 'normal', 'high', 'critical'));

alter table public.tester_feedback
  drop constraint if exists tester_feedback_status_check;
alter table public.tester_feedback
  add constraint tester_feedback_status_check
  check (status in ('new', 'in_progress', 'resolved', 'wontfix'));

create index if not exists tester_feedback_user_id_idx on public.tester_feedback (user_id);
create index if not exists tester_feedback_status_idx on public.tester_feedback (status);
create index if not exists tester_feedback_created_at_idx on public.tester_feedback (created_at desc);

alter table public.tester_feedback enable row level security;

-- Residents see only their own; board/admin see all
drop policy if exists "tester_feedback_select" on public.tester_feedback;
create policy "tester_feedback_select" on public.tester_feedback
  for select to authenticated using (
    user_id = auth.uid ()
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

-- Approved users can insert their own feedback
drop policy if exists "tester_feedback_insert" on public.tester_feedback;
create policy "tester_feedback_insert" on public.tester_feedback
  for insert to authenticated with check (
    user_id = auth.uid ()
    and exists (
      select 1
        from public.profiles p
       where p.id = auth.uid ()
         and p.approval_status = 'approved'
    )
  );

-- Authors can edit their own feedback only while it is still 'new'
drop policy if exists "tester_feedback_update_own" on public.tester_feedback;
create policy "tester_feedback_update_own" on public.tester_feedback
  for update to authenticated using (
    user_id = auth.uid ()
    and status = 'new'
  )
  with check (
    user_id = auth.uid ()
    and status = 'new'
  );

-- Board/admin can update any row (status changes, admin notes)
drop policy if exists "tester_feedback_board_update" on public.tester_feedback;
create policy "tester_feedback_board_update" on public.tester_feedback
  for update to authenticated using (
    exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  )
  with check (
    exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

-- Authors can delete their own feedback while still 'new'
drop policy if exists "tester_feedback_delete_own" on public.tester_feedback;
create policy "tester_feedback_delete_own" on public.tester_feedback
  for delete to authenticated using (
    user_id = auth.uid ()
    and status = 'new'
  );
