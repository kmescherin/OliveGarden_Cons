#!/usr/bin/env bash
# Выдать роль admin (правление + полный доступ по схеме) пользователю по email.
# Запуск на сервере, где поднят deploy/supabase:
#   ./scripts/grant-admin-by-email.sh 'you@example.com'
set -euo pipefail
cd "$(dirname "$0")/.."
EMAIL="${1:-}"
if [[ -z "$EMAIL" || "$EMAIL" == *"'"* ]]; then
  echo "Usage: $0 <email>" >&2
  exit 1
fi
if ! [[ "$EMAIL" =~ ^[^[:space:]]+@[^[:space:]]+\.[^[:space:]]+$ ]]; then
  echo "Invalid email." >&2
  exit 1
fi

docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
  from auth.users
 where email = '$EMAIL'
on conflict (user_id, role) do nothing;

select u.email, ur.role
  from auth.users u
  join public.user_roles ur on ur.user_id = u.id
 where u.email = '$EMAIL';
SQL
