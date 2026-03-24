#!/usr/bin/env bash
# Безопасная сборка Next.js на слабом сервере:
# - Ограничивает кучу V8, чтобы один процесс Node не съел всю ОЗУ и не убил хост.
# - Отключает телеметрию Next.
#
# Подбор лимита: ~60–70% от доступной RAM минус запас на ОС и Postgres (если на том же хосте).
# Примеры:
#   NEXT_BUILD_HEAP_MB=1536 ./scripts/build-safe.sh
#   NEXT_BUILD_HEAP_MB=3072 ./scripts/build-safe.sh
#
# Если сборка падает с "JavaScript heap out of memory" — увеличьте NEXT_BUILD_HEAP_MB
# или соберите на другой машине / в CI; добавьте swap (2G+) на VPS.
set -euo pipefail
cd "$(dirname "$0")/.."
HEAP="${NEXT_BUILD_HEAP_MB:-2048}"
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--max-old-space-size=${HEAP}"
echo "[build-safe] max-old-space-size=${HEAP} MB"
exec npx next build "$@"
