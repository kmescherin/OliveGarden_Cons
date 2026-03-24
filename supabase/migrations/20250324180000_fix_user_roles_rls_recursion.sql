-- RLS on user_roles referenced user_roles in the policy → infinite recursion (42P17).

create or replace function public.user_has_staff_role (uid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = uid
       and ur.role in ('board', 'admin')
  );
$$;

alter function public.user_has_staff_role (uuid) set row_security = off;

revoke all on function public.user_has_staff_role (uuid) from public;
grant execute on function public.user_has_staff_role (uuid) to authenticated;

drop policy if exists "user_roles_select" on public.user_roles;

create policy "user_roles_select" on public.user_roles
  for select to authenticated using (
    user_id = auth.uid ()
    or public.user_has_staff_role (auth.uid ())
  );
