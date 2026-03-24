-- Display name of moderator who last reviewed (for resident profile UI; RLS hides other profiles)
alter table public.profiles
  add column if not exists reviewed_by_name text;

-- Residents must not change moderation fields including display name
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
      or old.reviewed_by_name is distinct from new.reviewed_by_name
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
declare
  moderator_name text;
begin
  if not exists (
    select 1
      from public.user_roles ur
     where ur.user_id = auth.uid ()
       and ur.role in ('board', 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  select p.full_name
    into moderator_name
    from public.profiles p
   where p.id = auth.uid ();

  update public.profiles
     set approval_status = new_status,
         approval_note = nullif(trim(note), ''),
         reviewed_by = auth.uid (),
         reviewed_at = now (),
         reviewed_by_name = moderator_name,
         updated_at = now ()
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
