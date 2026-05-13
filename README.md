# Olive Garden — консьерж ЖК

Веб-приложение для управления жилым комплексом: заявки, голосования, парковка, уведомления, RAG-чат с документацией.

**Стек:** Next.js 15 (App Router, PWA) + Supabase (Auth, Postgres, Storage, Realtime, Edge Functions) + Docker.

**Репозиторий:** [github.com/kmescherin/OliveGarden_Cons](https://github.com/kmescherin/OliveGarden_Cons)

---

## Что умеет

### Жители

| Возможность | Маршрут |
|---|---|
| Регистрация с модерацией | `/register` → ожидание одобрения → `/pending` |
| Личный кабинет | `/dashboard` — карточки с быстрым доступом |
| Сервисные заявки (с фото) | `/dashboard/services` — создание и отслеживание статуса |
| Предложения и обратная связь | `/dashboard/suggestions` — подать и посмотреть ответы правления |
| Парковка и доступ | `/dashboard/parking` — автомобили, гостевые пропуска, ключи/брелоки |
| RAG-чат с документацией ЖК | `/dashboard/chat` — вопросы по уставу, правилам, решениям правления |
| Уведомления (колокольчик) | `/dashboard/notifications` — in-app + push + email |
| Профиль | `/profile` |

### Правление и админы

| Возможность | Маршрут |
|---|---|
| Модерация регистраций | `/board/moderation` |
| Управление контентом | `/board/content` — объявления, члены правления, собрания, выборы, типы заявок, база знаний |
| Очередь заявок | `/board/services` — смена статуса, фото |
| Предложения жителей | `/board/suggestions` — ответы |
| Парковка и доступ (все жители) | `/board/parking` — реестр авто, пропуска, ключи/брелоки |
| Админ-панель (только admin) | `/admin` — роли пользователей, `/admin/users` |

### Публичные страницы

`/info/announcements` `/info/board` `/info/meetings` `/info/elections` `/info/rules` `/info/zones` — доступны без входа.

---

## Функционал в деталях

### Собрания и решения

- Собрания трёх типов: очередные, внеочередные, годовые
- Статусный цикл: запланировано → завершено / отменено
- Повестка, протокол, место, дата
- Книга решений с привязкой к собранию
- Уведомление всем жителям при создании нового собрания

### Выборы

- Кандидаты с программами и сортировкой
- Год выборов, порядок отображения

### Парковка и доступ

- **Автомобили:** постоянные и временные, с номером и сроком действия. Житель добавляет сам, правление видит всех
- **Гостевые пропуска:** автомобиль / пешеход, с датами и отменой
- **Ключи и брелоки:** выдает правление, типы (входной, парковочный, кладовка, почта), статусы (выдан / возвращён / утерян)

### Уведомления

Три канала доставки:

1. **In-app** — колокольчик, Realtime, список `/dashboard/notifications`
2. **Email** — SMTP через Nodemailer, с fallback на console.log если не настроен
3. **Web Push** — VAPID, подписка/отписка через API, автодоудаление просроченных подписок

Типы уведомлений: новое объявление, статус заявки, статус предложения, новое собрание, новое решение, статус гостевого пропуска.

### RAG-чат

Загрузка PDF/TXT документов через `/board/content` → чанкинг (800 символов, overlap 100) → эмбеддинги через OpenAI `text-embedding-3-small` → векторный поиск в Supabase. Чат возвращает ответ с источниками и цитатами.

**LLM-провайдер:** при наличии `DEEPSEEK_API_KEY` ответ синтезируется через DeepSeek (`deepseek-v4-flash`, OpenAI-совместимый endpoint). При отсутствии — используется OpenAI (`gpt-4o-mini`). Эмбеддинги остаются на OpenAI; если `OPENAI_API_KEY` не задан, поиск переключается на keyword-fallback (`match_document_chunks_by_text`).

### Обратная связь от пользователей и тестировщиков

Отдельная форма для жалоб на ошибки, пожеланий и вопросов о самом приложении (не путать с `/dashboard/suggestions` — те предложения адресованы правлению о ЖК).

- Жители: `/dashboard/feedback` — форма + история своих обращений с автозаполнением URL страницы и user-agent
- Правление/админ: `/board/feedback` — инбокс со статусами (new / in_progress / resolved / wontfix), фильтрами по категории (bug / feature / question / other) и важности

Таблица `public.tester_feedback` с RLS: автор видит свои, правление видит всё и меняет статус.

### Типы заявок

Настраиваемый каталог: правление создаёт типы заявок (сантехника, электрика, уборка и т.д.) с ключами и сортировкой.

---

## Архитектура

```
apps/web/                    Next.js App Router
  src/features/*             Фичи: admin, auth, board, services, parking, elections, meetings, notifications, rag...
  src/app/[locale]/*         Роуты с i18n (tr, ru, en)
  src/app/api/*              API: health, rag/chat, rag/ingest, push/subscribe, push/unsubscribe
  src/lib/*                  Shared: supabase clients, email, web-push, profile, rate-limiter
  src/types/database.ts      TypeScript-типы всех таблиц

deploy/
  supabase/                  Self-hosted Supabase (Docker Compose)
  nginx/                     Nginx-конфиг + SSL
  olive-garden-web.service   systemd-юнит

supabase/migrations/         Схема БД, RLS, RPC, триггеры
deploy.sh                    Скрипт полного деплоя одной командой
docker-compose.yml           Web + Nginx в общей Docker-сети
```

### Безопасность

- **RLS** на всех таблицах: жители видят только свои данные, правление — все
- **Zod-валидация** серверных экшенов
- **Rate limiting** (in-memory sliding window) на критичные эндпоинты
- **Security headers:** X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **JWT 24ч**, пароли от 8 символов (буквы + цифры), подтверждение email
- **`SUPABASE_SERVICE_ROLE_KEY`** используется только в server actions/API routes, никогда на клиенте

### i18n

Три языка: турецкий (`/tr`), русский (`/ru`), английский (`/en`). Файлы переводов в `apps/web/messages/{tr,ru,en}.json`.

---

## Быстрый старт

### Локальная разработка

```bash
cd apps/web
cp .env.docker.example .env.local
npm install
npm run dev
```

Приложение на `http://localhost:3000/tr`.

Для Supabase локально нужен **Docker**:

```bash
npx supabase start
npx supabase db reset    # применяет все миграции из supabase/migrations/
```

Переменные для Next.js:

```bash
npx supabase status -o env
```

`API_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. Всё это в `apps/web/.env.local` вместе с `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

### Деплой на сервер одной командой

```bash
bash deploy.sh
```

Скрипт:
- Проверит зависимости (docker, openssl, curl)
- Запросит домен, SSL, SMTP
- Сгенерирует секреты и VAPID-ключи
- Поднимет Supabase, применит миграции
- Соберёт и запустит Next.js + Nginx

### Деплой вручную

#### Supabase (self-hosted)

Стек в [`deploy/supabase/`](deploy/supabase/) — копия [supabase/docker](https://github.com/supabase/supabase/tree/master/docker):

```bash
cd deploy/supabase
cp .env.example .env
sh utils/generate-keys.sh --update-env
# Заполните SITE_URL, SUPABASE_PUBLIC_URL, API_EXTERNAL_URL в .env
docker compose up -d

# Миграции:
for f in ../../supabase/migrations/*.sql; do
  docker compose exec -T db psql -U supabase_admin -d postgres -f - < "$f"
done
```

Kong слушает на порту из `KONG_HTTP_PORT` (обычно 8000). Nginx фронтенда проксирует `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1`, `/functions/v1` на этот порт.

Ключи `ANON_KEY` / `SERVICE_ROLE_KEY` из `deploy/supabase/.env` → в `apps/web/.env` как `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY`. `NEXT_PUBLIC_SUPABASE_URL` — публичный HTTPS-URL домена.

#### Supabase Studio

Studio не висит на публичном URL — она за Basic Auth в Kong:

1. Порт: `KONG_HTTP_PORT` из `.env`
2. Логин/пароль: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` из `.env`
3. Через SSH-туннель: `ssh -L 8000:127.0.0.1:8000 user@сервер` → `http://127.0.0.1:8000/`

#### Первый админ

```bash
cd deploy/supabase
chmod +x scripts/grant-admin-by-email.sh
./scripts/grant-admin-by-email.sh 'ваш@email.com'
```

Или через psql:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users
where email = 'ваш@email.com'
on conflict (user_id, role) do nothing;
```

#### Nginx + Next.js

```bash
cd apps/web && npm ci && npm run build
sudo cp deploy/olive-garden-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now olive-garden-web
```

Обновление: `npm run build:safe && sudo systemctl restart olive-garden-web`. Логи: `journalctl -u olive-garden-web -f`.

Юнит задаёт `MemoryMax=900M` — при OOM увеличьте лимит или swap.

---

## Переменные окружения

### Обязательные

| Переменная | Описание |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL сайта (https://домен) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (только сервер) |

### Опциональные

| Переменная | Описание |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Email-уведомления |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `DEEPSEEK_API_KEY` | RAG-чат через DeepSeek (приоритет над OpenAI). Эндпоинт OpenAI-совместимый. |
| `DEEPSEEK_BASE_URL` | По умолчанию `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | По умолчанию `deepseek-v4-flash` |
| `OPENAI_API_KEY` | Эмбеддинги RAG (`text-embedding-3-small`). Если не задан — fallback на keyword-поиск. Также может использоваться как LLM, если DEEPSEEK_API_KEY пустой. |

---

## Сборка

На VPS с ограниченной RAM:

```bash
cd apps/web && npm ci && npm run build:safe
```

`build:safe` ограничивает кучу Node (`NEXT_BUILD_HEAP_MB`, по умолчанию 2048) и отключает телеметрию. В `next.config.ts` включён `webpackMemoryOptimizations`. Обычная сборка: `npm run build`.

Проверка типов: `npm run typecheck`.

PWA через `@ducanh2912/next-pwa`, отключена в development.

---

## 502 и заголовки

Если nginx отдаёт **502** и в логе `upstream sent too big header` — в `location /` для прокси на 3000 добавьте:

```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

---

## Память на VPS (6 GB и меньше)

Не запускайте одновременно `deploy/supabase` и `npx supabase start` — получите два стека и забьёте RAM. Для разработки — CLI, для продакшена — `deploy/supabase`.

В [`deploy/supabase/docker-compose.override.yml`](deploy/supabase/docker-compose.override.yml) заданы лимиты памяти для каждого контейнера. Все сервисы в общей Docker-сети `olivegarden`.

---

## Документация

- [docs/TZ.md](docs/TZ.md) — техническое задание, модули
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — архитектура, RLS, ADR

---

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | Next.js 15 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix, Lucide |
| База данных | Supabase (Postgres, RLS, Realtime, Storage, Edge Functions) |
| Валидация | Zod |
| i18n | next-intl (tr, ru, en) |
| Анимации | motion |
| PWA | @ducanh2912/next-pwa |
| Email | Nodemailer |
| Push | web-push (VAPID) |
| RAG | OpenAI text-embedding-3-small + pgvector |
| Деплой | Docker Compose, Nginx, systemd |
