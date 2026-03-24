-- Board/admin can read audit trail; extend moderation payload with note

drop policy if exists "audit_log_board_select" on public.audit_log;

create policy "audit_log_board_select" on public.audit_log
  for select to authenticated using (
    exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid ()
         and ur.role in ('board', 'admin')
    )
  );

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
  trimmed_note text;
begin
  if not exists (
    select 1
      from public.user_roles ur
     where ur.user_id = auth.uid ()
       and ur.role in ('board', 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  trimmed_note := nullif(trim(note), '');

  select p.full_name
    into moderator_name
    from public.profiles p
   where p.id = auth.uid ();

  update public.profiles
     set approval_status = new_status,
         approval_note = trimmed_note,
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
    jsonb_build_object(
      'status', new_status,
      'note', trimmed_note
    )
  );
end;
$$;
