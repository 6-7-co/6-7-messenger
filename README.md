# Messenger

Приватный мессенджер для двоих: переписка в реальном времени, отправка фотографий и закрепление сообщений. Десктоп-приложение (Windows/macOS/Linux) + серверный бэкенд.

## Возможности

- Обмен текстовыми сообщениями в реальном времени (WebSocket, мгновенная доставка без обновления страницы)
- Отправка фотографий (JPEG / PNG / GIF / WebP) с предпросмотром и просмотром на весь экран
- Закрепление / открепление сообщений в чате (одно закреплённое на диалог)
- Редактирование и удаление своих сообщений
- Индикатор «печатает…» и статус «online/offline»
- Непрочитанные сообщения, счётчики и сортировка диалогов
- Аутентификация: JWT access + refresh-токены, безопасное хранение паролей (scrypt)
- Чёрно-белый минималистичный дизайн

## Технологии

| Слой | Технологии |
| --- | --- |
| Desktop | Electron, React 18, TypeScript, Vite, socket.io-client |
| API | NestJS (Node.js), Socket.IO, Passport/JWT, Helmet, Throttler, class-validator |
| БД | PostgreSQL 16 + Prisma ORM |
| Хранение файлов | Локальный диск или S3-совместимое хранилище (Cloudflare R2, MinIO, AWS S3) |
| Инфраструктура | Docker, Docker Compose, Kubernetes (манифесты в `k8s/`) |

## Структура проекта

```
.
├── apps/
│   ├── api/                 # NestJS backend (REST + WebSocket)
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   └── Dockerfile
│   └── desktop/             # Electron + React клиент
│       ├── electron/        # main + preload процессы
│       └── src/             # React UI
├── packages/shared/         # Общие типы и константы событий
├── k8s/                     # Kubernetes-манифесты
├── docker-compose.yml       # PostgreSQL (+ опционально API)
├── setup.ps1 / dev.ps1 / build.ps1   # PowerShell-скрипты для Windows
└── .env.example
```

---

## Запуск локально (Windows)

### 1. Что нужно скачать

- **Node.js 20 LTS** — https://nodejs.org
- **Docker Desktop** — https://www.docker.com/products/docker-desktop (нужен для PostgreSQL; без него поднимите Postgres сами)
- **Git** — https://git-scm.com

Проверка:

```powershell
node --version
docker --version
```

### 2. Установка и первый запуск (одной командой)

Откройте PowerShell в папке проекта и выполните:

```powershell
.\setup.ps1
```

Скрипт сам: установит зависимости, создаст `.env`, поднимет PostgreSQL в Docker, сгенерирует Prisma-клиент и применит схему БД.

То же самое вручную:

```powershell
npm install                          # зависимости + сборка общего пакета
copy .env.example .env               # корневой .env (пароль Postgres)
copy apps\api\.env.example apps\api\.env   # .env для API (JWT-секреты)
docker compose up -d db              # PostgreSQL на порту 5432
npm run db:generate                  # генерация Prisma-клиента
npm run db:push                      # создать таблицы в БД
```

> **Важно:** поменяйте `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` и `POSTGRES_PASSWORD` в `.env` на свои длинные случайные значения (≥ 32 символа). Сгенерировать можно, например, в PowerShell: `[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")`.

### 3. Запуск в режиме разработки

Терминал 1 — API:

```powershell
npm run dev:api
```

Терминал 2 — десктоп-окно Electron (с hot-reload):

```powershell
npm run dev:electron
```

Либо просто браузерный предпросмотр интерфейса (удобно для проверки дизайна):

```powershell
npm run dev:desktop
# откройте http://localhost:5173
```

### 4. Адрес сервера

Приложение берёт адрес API из файла **`apps/desktop/config.json`**:

```json
{
  "apiBase": "http://localhost:3000"
}
```

Порядок приоритета: переменная окружения `MESSENGER_API_URL` → `config.json` рядом с приложением → `localhost:3000`. Для быстрой проверки можно не трогать файл, а задать переменную:

```powershell
$env:MESSENGER_API_URL = "http://192.168.0.110:3000"
npm run dev:electron
```

### 5. Сборка установщика Windows (.exe)

```powershell
npm run package:win -w @messenger/desktop
```

Готовый установщик появится в `apps/desktop/release/`. **Перед сборкой** впишите нужный адрес сервера в `apps/desktop/config.json` — тогда установщик сразу будет ходить на правильный сервер, и другу не нужно ничего настраивать.

### Как общаться с другом

Всё просто: **сервер один**, а клиенты (у тебя и у друга) подключаются к нему. Регистрируете два аккаунта, затем один вводит никнейм другого в поле «Start chat by username…» — диалог создаётся у обоих.

**Проверка на одном компе (без друга):** запусти сервер и открой два окна — например, два раза приложение или обычное + приватное окно браузера (`npm run dev:desktop` → http://localhost:5173). Зарегистрируй `alex` и `bob`, начни чат.

**Вариант A — друг в той же Wi-Fi сети (самое быстрое, без хостинга):**

1. Узнай свой IP в локалке: `ipconfig` → строка «IPv4-адрес» (например `192.168.0.110`).
2. Запусти сервер: `npm run dev:api` (он уже слушает все интерфейсы, порт 3000).
3. Собери установщик, указав в `apps/desktop/config.json` адрес `http://192.168.0.110:3000`, и отдай `.exe` другу.
4. Друг ставит, регистрируется — и вы общаетесь.

Минусы: твой компьютер должен быть включён, и вы в одной сети (иначе нужен проброс порта/белый IP).

**Вариант B — онлайн, с бесплатным хостингом:** см. раздел ниже — там деплой сервера, потом тот же установщик, но с адресом вида `https://ваш-api.example.com`.

**Вариант C — быстро глянуть онлайн без хостинга:** запусти локальный туннель, он даст публичный HTTPS-адрес на твой `localhost:3000`:

```powershell
cloudflared tunnel --url http://localhost:3000
# или
ngrok http 3000
```

Вставь выданный адрес в `config.json`, собери/запусти приложение — друг сможет зайти, пока твой комп и туннель работают.

---

## Запуск через Docker Compose (весь бэкенд)

```powershell
docker compose --profile full up --build
```

Поднимет и PostgreSQL, и API (порт `3000`). Затем запустите десктоп-клиент и укажите `MESSENGER_API_URL=http://localhost:3000`.

---

## Бесплатный хостинг (чтобы пользоваться онлайн)

Десктоп-приложению не нужен веб-сайт — нужно разместить **только бэкенд** (API + PostgreSQL + хранилище фото). После деплоя оба указываете адрес сервера через `MESSENGER_API_URL` при сборке.

Цены/лимиты бесплатных тарифов меняются — проверяйте актуальные условия на сайтах.

### Рекомендуемая связка (полностью бесплатно)

**1. База данных — Neon (бесплатный managed PostgreSQL)**

- Сайт: https://neon.tech
- Бесплатный тариф: отдельный проект Postgres, достаточно для двоих.
- Создайте проект → скопируйте строку подключения вида `postgresql://user:pass@host/db?sslmode=require` и вставьте её в переменную `DATABASE_URL`.

**2. Файлы (фото) — Cloudflare R2 (S3-совместимое, без платы за трафик)**

- Сайт: https://dash.cloudflare.com → R2 → создать bucket (например, `messenger-uploads`).
- Бесплатно: 10 ГБ хранения, 10 млн операций чтения/записи в месяц, **без платы за исходящий трафик**.
- Укажите в переменных окружения: `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `S3_BUCKET=messenger-uploads`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` (публичный домен, привязанный к bucket).

**3. Сам API — Render (бесплатный web service)**

- Сайт: https://render.com
- Free tier: web service с 512 МБ RAM. Минус — засыпает после бездействия и просыпается ~30–60 сек при первом запросе.
- Подключите GitHub-репозиторий, Build Command: `npm install && npm run build`, Start Command: `npm run start:prod -w @messenger/api`, Dockerfile тоже поддерживается (используйте `apps/api/Dockerfile`).
- Добавьте переменные окружения (`DATABASE_URL`, `JWT_*`, `S3_*`, `ALLOWED_ORIGINS=*`).

### Альтернативы

| Сервис | Что даёт бесплатно | Комментарий |
| --- | --- | --- |
| **Railway** | пробные кредиты $5 | https://railway.app — простой деплой из Dockerfile |
| **Koyeb** | free instance | https://koyeb.com — Docker, WebSocket поддерживается |
| **Fly.io** | pay-as-you-go | https://fly.io — WebSocket работает, нужна карта |
| **Supabase** | free Postgres + Storage | https://supabase.com — можно использовать вместо Neon, а Storage вместо R2 |
| **Aiven / Tembo / ElephantSQL** | бесплатные Postgres | альтернативы Neon |
| **MinIO** (self-hosted) | бесплатно | S3-совместимое хранилище на своём сервере |

> **Важно про WebSocket.** Платформа должна поддерживать постоянные соединения. Render, Railway, Fly.io, Koyeb поддерживают. Хостинги, которые работают только со «serverless-функциями» (Vercel, Netlify Functions, Cloudflare Workers) для этого NestJS-приложения **не подходят**.

### После деплоя

Впишите адрес сервера в `apps/desktop/config.json`:

```json
{
  "apiBase": "https://ваш-api.example.com"
}
```

Соберите установщик и раздайте другу:

```powershell
npm run package:win -w @messenger/desktop
```

Готовый `.exe` лежит в `apps/desktop/release/`. Установите его оба — и общайтесь онлайн.

---

## Развёртывание в Kubernetes

Манифесты лежат в `k8s/`. Требуются: кластер + `kubectl` + (для TLS) ingress-nginx и cert-manager.

```bash
# 1. Секреты — ОБЯЗАТЕЛЬНО замените значения
kubectl create ns messenger
kubectl apply -f k8s/secret.example.yaml   # предварительно отредактируйте!

# 2. База данных
kubectl apply -f k8s/postgres.yaml

# 3. Соберите и запушьте образ API (замените YOUR_USER)
docker build -f apps/api/Dockerfile -t ghcr.io/YOUR_USER/messenger-api:latest .
docker push ghcr.io/YOUR_USER/messenger-api:latest

# 4. Отредактируйте image и S3-переменные в k8s/api.yaml, затем:
kubectl apply -f k8s/api.yaml

# 5. Ingress + TLS (отредактируйте домен)
kubectl apply -f k8s/ingress.yaml
```

> В кластере приложение использует S3-драйвер хранилища (`STORAGE_DRIVER=s3`) — локальный диск у подов эфемерный. Файлы держите в R2/S3.

---

## Безопасность (что уже сделано)

- Пароли хэшируются **scrypt** (через Node `crypto`), без внешних зависимостей
- **JWT** access (15 мин) + refresh (30 дней, ротация); refresh хранится хэшированным в БД (`sha256`)
- Refresh-токен дополнительно кладётся в **httpOnly-куку** (`secure`, `sameSite=none`)
- Rate limiting на эндпоинтах входа/регистрации и глобальный лимит запросов (Throttler)
- Валидация всех входных DTO (`class-validator`, `whitelist`, `forbidNonWhitelisted`)
- Проверка **магических байтов** загружаемых файлов — принимаются только реальные изображения, лимит 10 МБ
- Защита от path traversal при раздаче файлов (basename)
- Каждое сообщение проверяется на членство в диалоге; редактировать/удалять/закреплять может только участник (удалять/править — только автор)
- WebSocket-подключения авторизуются JWT, комнаты выдаются только после проверки членства
- Helmet + CSP в интерфейсе, `contextIsolation` в Electron (нет доступа к Node из рендера)

**Рекомендации для прод-деплоя:** используйте длинные случайные секреты, включите TLS везде, закройте порт 5432 от внешней сети, при желании ограничьте `ALLOWED_ORIGINS` списком конкретных доменов и включите регулярные бэкапы БД.

---

## Основные переменные окружения (`apps/api/.env`)

| Переменная | Описание |
| --- | --- |
| `DATABASE_URL` | строка подключения PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | секреты подписи токенов (≥32 симв.) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | время жизни токенов |
| `PORT` | порт API (по умолчанию 3000) |
| `ALLOWED_ORIGINS` | `*` или список доменов через запятую |
| `STORAGE_DRIVER` | `local` или `s3` |
| `UPLOAD_DIR` | папка для файлов при `local` |
| `MAX_UPLOAD_BYTES` | макс. размер файла (по умолчанию 10 МБ) |
| `S3_*` | настройки S3/R2 при `STORAGE_DRIVER=s3` |

## Полезные команды

```powershell
npm run dev:api              # API в watch-режиме
npm run dev:electron         # десктоп-окно Electron
npm run dev:desktop          # браузерный предпросмотр UI
npm run build                # сборка всего (shared + api + desktop)
npm run db:generate          # перегенерировать Prisma-клиент
npm run db:push              # применить схему к БД
npm run db:migrate           # создать/применить миграцию (prisma migrate dev)
npm run package:win -w @messenger/desktop   # установщик Windows
```

## API (кратко)

Все маршруты под префиксом `/api`, авторизация — заголовок `Authorization: Bearer <accessToken>`.

| Метод | Путь | Назначение |
| --- | --- | --- |
| POST | `/auth/register` | регистрация |
| POST | `/auth/login` | вход |
| POST | `/auth/refresh` | обновить токены |
| POST | `/auth/logout` | выход |
| GET | `/auth/me` | текущий пользователь |
| PATCH | `/auth/password` | смена пароля |
| PATCH | `/auth/profile` | профиль |
| GET | `/conversations` | список диалогов |
| POST | `/conversations/direct` | создать/найти диалог по username |
| POST | `/conversations/:id/read` | отметить прочитанным |
| GET | `/conversations/:id/messages` | сообщения (с пагинацией `before`) |
| POST | `/conversations/:id/messages/text` | отправить текст |
| POST | `/conversations/:id/messages/image` | отправить фото (по URL) |
| PATCH | `/messages/:id` | редактировать |
| DELETE | `/messages/:id` | удалить |
| POST / DELETE | `/conversations/:id/pin` | закрепить / открепить |
| POST | `/uploads/images` | загрузка файла (multipart `file`) |
| GET | `/health` | проверка состояния |

WebSocket-события описаны в `packages/shared/src/index.ts` (`Events` / `ClientEvents`).
