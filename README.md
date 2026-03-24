# Olive Garden — электронный консьерж ЖК

Монорепозиторий: **Next.js (PWA)** + **Supabase** (Auth, Postgres, Storage, Edge Functions).

**Репозиторий:** [github.com/kmescherin/OliveGarden_Cons](https://github.com/kmescherin/OliveGarden_Cons) — основная ветка разработки: **`dev`**.

## Документация

- [docs/TZ.md](docs/TZ.md) — ТЗ и модули M1–M7
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — архитектура, RLS, админка, nginx, ADR

## Быстрый старт

### Веб

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Откройте `http://localhost:3000/tr` (или `/ru`).

### Supabase (локально)

Требуется **Docker**. Из **корня** репозитория:

```bash
npx supabase start
npx supabase db reset   # миграции из supabase/migrations/ и supabase/seed.sql
```

Переменные для Next.js: `npx supabase status -o env` — поля `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. Удобно положить в `apps/web/.env.local` вместе с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

Если после `db reset` в конце появится **502** при перезапуске контейнеров, чаще всего стек всё равно поднимается: выполните `npx supabase status` и повторите команду при необходимости.

### Supabase (self-hosted Docker на сервере)

Официальный стек лежит в [`deploy/supabase/`](deploy/supabase/) (копия [supabase/docker](https://github.com/supabase/supabase/tree/master/docker)).

```bash
cd deploy/supabase
cp .env.example .env
sh utils/generate-keys.sh --update-env
# Заполните SITE_URL, SUPABASE_PUBLIC_URL, API_EXTERNAL_URL, KONG_*_PORT, POOLER_HOST_PORT — см. комментарии в .env
docker compose up -d
# Схема: применить все миграции по порядку из ../../supabase/migrations/
# (или: из корня репозитория ./scripts/apply-supabase-migrations.sh при настроенном supabase link)
for f in ../../supabase/migrations/*.sql; do
  docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done
```

Kong слушает на хосте порт из `KONG_HTTP_PORT` (по умолчанию в шаблоне 8000; при конфликте смените). Nginx основного сайта должен проксировать пути `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1`, `/functions/v1` и т.д. на этот порт. Ключи `ANON_KEY` / `SERVICE_ROLE_KEY` из `deploy/supabase/.env` переносите в `apps/web/.env` как `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY`; `NEXT_PUBLIC_SUPABASE_URL` — публичный HTTPS-URL того же домена, что и фронт.

**Почему «с сайта» Studio не открывается:** у прод-сайта корень `/` обычно отдаёт **Next.js**. API Supabase идёт на те же пути `/auth`, `/rest`, … — это **Kong**, но **Supabase Studio** при такой схеме **не** висит на публичном `https://ваш-домен/`. Studio — отдельный вход (ниже).

#### Как зайти в Supabase Studio (self-hosted)

1. Узнайте порт Kong: в `deploy/supabase/.env` переменная **`KONG_HTTP_PORT`** (часто `8000`).
2. Логин/пароль для Studio задаются **`DASHBOARD_USERNAME`** и **`DASHBOARD_PASSWORD`** в том же `.env` (Basic Auth в Kong для маршрута `/` → Studio).
3. Откройте Studio одним из способов:
   - **С сервера по SSH:** `curl -sI -u "ЛОГИН:ПАРОЛЬ" "http://127.0.0.1:8000/"` (подставьте порт из `.env`) — если ответ не `connection refused`, в браузере на сервере: `http://127.0.0.1:8000/`.
   - **С вашего ПК через туннель:**  
     `ssh -L 8000:127.0.0.1:8000 user@ваш-сервер`  
     затем в браузере: `http://127.0.0.1:8000/` и ввести `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
   - Если поднят вариант с **`docker-compose.nginx.yml`** и **`PROXY_DOMAIN`**, Studio может быть на **`https://PROXY_DOMAIN/`** с тем же Basic Auth (см. `deploy/supabase/volumes/proxy/nginx/supabase-nginx.conf.tpl`).

Если порт закрыт **firewall**, откройте его только для своего IP или пользуйтесь **SSH-туннелем** (предпочтительнее).

#### Сделать единственный аккаунт админом **без Studio**

На сервере:

```bash
cd deploy/supabase
chmod +x scripts/grant-admin-by-email.sh
./scripts/grant-admin-by-email.sh 'ваш@email.com'
```

Скрипт выполняет `INSERT` в `public.user_roles` и в конце показывает строки ролей для этого email. После этого выйдите из сайта ЖК и войдите снова (или обновите сессию).

#### Админ-панель в веб-приложении

После того как у учётки есть роль **`admin`**, в меню пользователя появится пункт **«Админка»**. Раздел **`/{locale}/admin`** (например `/ru/admin`): обзор, **`/admin/users`** — список пользователей из Auth, выдача/снятие ролей **board** и **admin** по кнопкам или по email. Нужны переменные **`SUPABASE_SERVICE_ROLE_KEY`** и **`NEXT_PUBLIC_SUPABASE_URL`** в окружении Next.js (уже требуются для RAG).

Вручную через `psql` (эквивалент):

```bash
cd deploy/supabase
docker compose exec -T db psql -U postgres -d postgres -c \
  "insert into public.user_roles (user_id, role) select id, 'admin'::app_role from auth.users where email = 'ваш@email.com' on conflict (user_id, role) do nothing;"
```

### Первый член правления (SQL по UUID)

Если знаете UUID из `auth.users`:

```sql
insert into public.user_roles (user_id, role)
values ('<uuid>'::uuid, 'admin')
on conflict (user_id, role) do nothing;
```

## Структура

- `apps/web` — Next.js App Router, `src/features/*` (в т.ч. `admin`, `board-moderation`, `auth`, …)
- `deploy/supabase` — production Docker Compose (self-hosted), не коммитьте `.env` и `volumes/db/data`
- `deploy/supabase/scripts/grant-admin-by-email.sh` — первый `admin` по email
- `scripts/apply-supabase-migrations.sh` — обёртка для `supabase db push` (удобно с CLI)
- `supabase/migrations` — схема, RLS (в т.ч. `user_has_staff_role`, `audit_log`), RPC `moderate_profile`, `match_document_chunks`
- `supabase/functions` — заготовки `ingest` и `rag-chat`

## Сборка

На VPS с ограниченной RAM предпочтительно:

```bash
cd apps/web
npm ci
npm run build:safe
```

`build:safe` задаёт лимит кучи Node (`NEXT_BUILD_HEAP_MB`, по умолчанию 2048) и отключает телеметрию; в `next.config.ts` включён `webpackMemoryOptimizations`. Обычная сборка: `npm run build`.

Проверка типов без полной сборки: `npm run typecheck`.

PWA (Workbox) подключается через `@ducanh2912/next-pwa` и отключена в `development`.

## Прод: сайт и 502

Nginx проксирует на `127.0.0.1:3000`. Нужны **сборка** и **демон**:

```bash
cd apps/web && npm ci && npm run build
sudo cp deploy/olive-garden-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now olive-garden-web
```

После деплоя кода: `npm run build:safe` (или `npm run build`) и `sudo systemctl restart olive-garden-web`. Логи: `journalctl -u olive-garden-web -f`.

Юнит [`deploy/olive-garden-web.service`](deploy/olive-garden-web.service) задаёт `MemoryMax=900M` на процесс `next start` — при OOM увеличьте лимит или RAM/swap.

Если nginx отдаёт **502** и в `/var/log/nginx/error.log` есть **`upstream sent too big header`** на запросах к Next.js — ответ с большими заголовками (часто **Set-Cookie** от Supabase SSR). В `location /` для прокси на `3000` добавьте, например: `proxy_buffer_size 128k;`, `proxy_buffers 4 256k;`, `proxy_busy_buffers_size 256k;`, на уровне `server` при необходимости — `large_client_header_buffers 4 16k;`.

## Память на VPS (6GB и меньше)

**Не запускайте одновременно** self-hosted `deploy/supabase` и локальный `npx supabase start` — получаются **два полных стека** (два Postgres, два Kong, два Logflare и т.д.) и быстро забивается RAM. Для разработки на машине — только CLI; на сервере продакшена — только `deploy/supabase`. Остановить CLI-стек: `npx supabase stop` из корня репозитория.

В [`deploy/supabase/docker-compose.override.yml`](deploy/supabase/docker-compose.override.yml) заданы лимиты памяти для контейнеров; при `docker compose up -d` они подхватываются автоматически.

Один процесс Next.js на порт 3000; лишние `next-server` завершите. При нехватке памяти увеличьте swap (например 2G) и не держите на проде Cursor/IDE.
