#!/usr/bin/env bash
# Применить миграции к связанному проекту Supabase (нужен `supabase link` и права).
# Для M3 важна миграция 20250324150000 (RLS audit_log + payload note в moderate_profile).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! command -v supabase >/dev/null 2>&1; then
  echo "Установите Supabase CLI: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi
exec supabase db push "$@"
