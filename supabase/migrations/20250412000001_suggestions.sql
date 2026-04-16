-- Suggestion box: residents can submit ideas/proposals to the board

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'pending',
  board_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

-- Residents can see their own; board can see all
drop policy if exists "suggestions_select" on public.suggestions;
create policy "suggestions_select" on public.suggestions
  for select to authenticated using (
    user_id = auth.uid ()
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

-- Residents can insert their own
drop policy if exists "suggestions_insert" on public.suggestions;
create policy "suggestions_insert" on public.suggestions
  for insert to authenticated with check (
    user_id = auth.uid ()
    and exists (
      select 1
        from public.profiles p
       where p.id = auth.uid ()
         and p.approval_status = 'approved'
    )
  );

-- Board can update (change status, add note)
drop policy if exists "suggestions_board_update" on public.suggestions;
create policy "suggestions_board_update" on public.suggestions
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
