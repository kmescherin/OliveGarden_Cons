-- Olive Garden concierge — core schema, RLS, RAG helpers

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Enums
do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.app_role as enum ('resident', 'board', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.service_request_status as enum ('new', 'in_progress', 'done', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_visibility as enum ('public', 'residents');
exception when duplicate_object then null;
end $$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  block text,
  apartment text,
  approval_status public.approval_status not null default 'pending',
  approval_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text,
  visibility public.content_visibility not null default 'public',
  updated_at timestamptz not null default now()
);

create table if not exists public.social_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  schedule text,
  sort_order int not null default 0
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  visibility public.content_visibility not null default 'residents',
  published_at timestamptz not null default now()
);

create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text,
  phone text,
  email text,
  sort_order int not null default 0
);

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_type_id uuid references public.service_types (id),
  description text not null,
  preferred_at timestamptz,
  status public.service_request_status not null default 'new',
  photo_paths text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.knowledge_documents (id) on delete cascade,
  content text not null,
  embedding vector (1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx on public.document_chunks (document_id);

-- Avoid HNSW on empty DB in some environments; IVFFLAT is optional later.
-- create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Auth: new user → profile + resident role
create or replace function public.handle_new_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, block, apartment)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'phone', ''),
      coalesce(new.raw_user_meta_data ->> 'block', ''),
      coalesce(new.raw_user_meta_data ->> 'apartment', '')
    );
  insert into public.user_roles (user_id, role)
    values (new.id, 'resident');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
execute procedure public.handle_new_user ();

-- Prevent residents from changing moderation fields (board / RPC only)
create or replace function public.protect_profile_moderation ()
  returns trigger
  language plpgsql
as $$
begin
  if (
    old.approval_status is distinct from new.approval_status
      or old.approval_note is distinct from new.approval_note
      or old.reviewed_by is distinct from new.reviewed_by
      or old.reviewed_at is distinct from new.reviewed_at
  ) then
    if not exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    ) then
      raise exception 'forbidden_profile_moderation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_moderation on public.profiles;

create trigger tr_profiles_moderation
  before update on public.profiles
  for each row
execute procedure public.protect_profile_moderation ();

-- Board moderation RPC
create or replace function public.moderate_profile (
  target_user_id uuid,
  new_status public.approval_status,
  note text default ''
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.user_roles ur
     where ur.user_id = auth.uid ()
       and ur.role in ('board', 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  update public.profiles
     set approval_status = new_status,
         approval_note = nullif(trim(note), ''),
         reviewed_by = auth.uid (),
         reviewed_at = now(),
         updated_at = now()
   where id = target_user_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, payload)
  values (
    auth.uid (),
    'moderate_profile',
    'profile',
    target_user_id::text,
    jsonb_build_object('status', new_status)
  );
end;
$$;

grant execute on function public.moderate_profile (uuid, public.approval_status, text) to authenticated;

-- Vector search (service role / admin client from API route)
create or replace function public.match_document_chunks (
  query_embedding vector (1536),
  match_count int default 8
)
  returns table (
    id uuid,
    content text,
    metadata jsonb,
    similarity float8
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
    from public.document_chunks dc
   where dc.embedding is not null
   order by dc.embedding <=> query_embedding
   limit match_count;
$$;

grant execute on function public.match_document_chunks (vector, int) to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_log enable row level security;
alter table public.content_pages enable row level security;
alter table public.social_zones enable row level security;
alter table public.announcements enable row level security;
alter table public.board_members enable row level security;
alter table public.service_types enable row level security;
alter table public.service_requests enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists "profiles_select_own_or_board" on public.profiles;
create policy "profiles_select_own_or_board" on public.profiles
  for select to authenticated using (
    id = auth.uid ()
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid ())
  with check (id = auth.uid ());

drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select" on public.user_roles
  for select to authenticated using (
    user_id = auth.uid ()
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

drop policy if exists "content_pages_read" on public.content_pages;
create policy "content_pages_read" on public.content_pages
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

drop policy if exists "content_pages_board_write" on public.content_pages;
create policy "content_pages_board_write" on public.content_pages
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

drop policy if exists "social_zones_read" on public.social_zones;
create policy "social_zones_read" on public.social_zones
  for select using (true);

drop policy if exists "social_zones_board_write" on public.social_zones;
create policy "social_zones_board_write" on public.social_zones
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

drop policy if exists "service_types_read" on public.service_types;
create policy "service_types_read" on public.service_types
  for select using (true);

drop policy if exists "service_requests_select" on public.service_requests;
create policy "service_requests_select" on public.service_requests
  for select to authenticated using (
    user_id = auth.uid ()
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

drop policy if exists "service_requests_insert" on public.service_requests;
create policy "service_requests_insert" on public.service_requests
  for insert to authenticated with check (
    user_id = auth.uid ()
    and exists (
      select 1
        from public.profiles p
       where p.id = auth.uid ()
         and p.approval_status = 'approved'
    )
  );

drop policy if exists "knowledge_board" on public.knowledge_documents;
create policy "knowledge_board" on public.knowledge_documents
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

-- Chunks: no direct client access; API uses service_role
drop policy if exists "document_chunks_no_client" on public.document_chunks;
create policy "document_chunks_no_client" on public.document_chunks
  for select to authenticated using (false);

-- Seed
insert into public.service_types (key, name, description, sort_order)
  values
    ('water', 'Water delivery', null, 1),
    ('appliance_repair', 'Appliance repair', null, 2),
    ('other', 'Other', null, 99)
on conflict (key) do nothing;

insert into public.content_pages (slug, title, body, visibility)
  values (
    'rules',
    'House rules',
    'Welcome. Replace this text with your complex rules (TR/RU).',
    'public'
  )
on conflict (slug) do nothing;

insert into public.social_zones (name, description, schedule, sort_order)
select 'Pool', 'Outdoor pool', '08:00–22:00 daily', 1
 where not exists (select 1 from public.social_zones where name = 'Pool');

insert into public.social_zones (name, description, schedule, sort_order)
select 'Gym', 'Fitness', '24/7', 2
 where not exists (select 1 from public.social_zones where name = 'Gym');

insert into public.social_zones (name, description, schedule, sort_order)
select 'BBQ', 'Barbecue area', '10:00–23:00', 3
 where not exists (select 1 from public.social_zones where name = 'BBQ');
