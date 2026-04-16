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
