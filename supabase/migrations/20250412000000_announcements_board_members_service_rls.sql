-- Announcements: RLS policies for board write, resident/public read

-- Public can see public announcements; residents can see residents-only too
drop policy if exists "announcements_read" on public.announcements;
create policy "announcements_read" on public.announcements
  for select using (
    visibility = 'public'
    or (
      visibility = 'residents'
      and auth.uid () is not null
      and exists (
        select 1
          from public.profiles p
         where p.id = auth.uid ()
           and p.approval_status = 'approved'
      )
    )
  );

-- Board/admin can CRUD announcements
drop policy if exists "announcements_board_write" on public.announcements;
create policy "announcements_board_write" on public.announcements
  for all to authenticated using (
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

-- Board members table: anyone can read
drop policy if exists "board_members_read" on public.board_members;
create policy "board_members_read" on public.board_members
  for select using (true);

-- Board/admin can CRUD board_members
drop policy if exists "board_members_board_write" on public.board_members;
create policy "board_members_board_write" on public.board_members
  for all to authenticated using (
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

-- Service requests: board can UPDATE status
drop policy if exists "service_requests_board_update" on public.service_requests;
create policy "service_requests_board_update" on public.service_requests
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
