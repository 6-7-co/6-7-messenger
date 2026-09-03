# 6&7 Messenger

Приватный десктоп-мессенджер для двоих. Realtime-чаты, отправка фото, закрепление и удаление сообщений. Стек подобран как в проде и упакован для Kubernetes.

## Стек

| Слой | Технологии |
| --- | --- |
| Десктоп | Electron + React + TypeScript (electron-vite, Zustand) |
| API | Fastify + TypeScript (Zod-валидация, JWT, rate-limit, Helmet) |
| БД | PostgreSQL + Prisma ORM |
| Realtime | WebSocket (авторизованные соединения, heartbeat) |
| Инфраструктура | Docker Compose + Kubernetes (Deployment/HPA/StatefulSet) |

## Структура

```
.
├── client/                  # Electron-приложение
│   ├── src/main/            # main-процесс (безопасный BrowserWindow, safeStorage, CSP)
│   ├── src/preload/         # preload (contextBridge)
│   └── src/renderer/        # React UI (чёрно-белый дизайн)
├── server/                  # API + WebSocket
│   ├── prisma/              # схема БД и seed
│   └── src/                 # модули: auth, users, chats, messages, uploads, ws
├── infra/k8s/               # Kubernetes-манифесты
├── docker-compose.yml       # postgres + server
├── scripts/                 # setup.sh, generate-secrets.sh
└── Makefile
```

## Что уже умеет

- Регистрация / вход / обновление токенов (access + refresh).
- Realtime-доставка сообщений и закреплений через WebSocket.
- Отправка текста и изображений (PNG/JPEG/GIF/WebP), валидация по сигнатуре файла.
- Закрепление (`📌`) и удаление своих сообщений.
- Поиск собеседника и создание личного чата.
- Чёрно-белый тёмный интерфейс.

## Что нужно скачать

Ссылки и команды для установки инструментов:

```bash
# Node.js 20+ (управление версиями): https://nodejs.org
node --version              # должно быть >= v20

# Docker (для локальной БД и контейнера сервера): https://docs.docker.com/get-docker/
docker --version
docker compose version

# Kubernetes CLI (только если деплоишь в кластер): https://kubernetes.io/docs/tasks/tools/
#   Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
#   macOS
brew install kubectl
kubectl version --client
```

## Быстрый старт (одна команда)

Всё уже разложено по файлам и папкам. Достаточно запустить bootstrap:

```bash
npm run setup
```

Этот скрипт: создаёт структуру папок (если пусто), копирует `.env.example` → `.env`, ставит зависимости через npm workspaces, поднимает PostgreSQL в Docker, запускает миграцию схемы (`prisma db push`) и сидит двух пользователей.

Можно через Makefile:

```bash
make setup
```

## Запуск в разработке

Из корня репозитория, два терминала:

```bash
# Терминал 1 — API + WebSocket (http://localhost:3000)
npm run dev:server

# Терминал 2 — Electron-приложение
npm run dev:client
```

или всё сразу:

```bash
make dev
```

Учётные записи после сида:

```
alex / alex-password     (вы)
kent / kent-password     (друг)
```

Сменить логины/пароли можно в `server/prisma/seed.ts`, `пароли/секреты` в `.env`.

## Сборка десктоп-пакетов

```bash
npm --workspace client run dist
```

Результат появится в `client/release/`: для macOS — `.dmg`, для Windows — `.exe` (NSIS/portable), для Linux — `.AppImage`/`.deb`.

## Docker (PostgreSQL + сервер)

```bash
docker compose up -d --build
```

Сервер поднимется на `http://localhost:3000`, БД — на `localhost:5432`. После первого запуска применяется схема и сидятся пользователи.

## Kubernetes

1. Собери и запушь образ сервера в свой registry, поправь `image` в `infra/k8s/server.yaml`.
2. Создай секреты и configmap:

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/secret.example.yaml   # замени значения секретов
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/postgres.yaml
kubectl apply -f infra/k8s/server.yaml
```

или через Kustomize одной командой:

```bash
kubectl apply -k infra/k8s
```

Для продакшена не коммить реальные секреты — в кластере используй External Secrets / Sealed Secrets вместо `secret.example.yaml`.

## Переменные окружения (`.env`)

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | DSN PostgreSQL (Prisma) |
| `JWT_ACCESS_SECRET` | — | Секрет access-токенов (мин. 16 символов) |
| `JWT_REFRESH_SECRET` | — | Секрет refresh-токенов (мин. 16 символов) |
| `JWT_ACCESS_TTL` | `15m` | Время жизни access-токена |
| `JWT_REFRESH_TTL` | `30d` | Время жизни refresh-токена |
| `CORS_ORIGIN` | `http://localhost:5173,null` | Разрешённые origin через запятую (`*` — все) |
| `UPLOAD_DIR` | `storage/uploads` | Где лежат загруженные фото |
| `MAX_UPLOAD_MB` | `25` | Лимит размера файла |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Порт и адрес API |
| `TRUST_PROXY` | `false` | Включать, если за reverse-proxy (в k8s — `true`) |

Сгенерировать криптостойкие секреты JWT:

```bash
bash scripts/generate-secrets.sh
```

## API (основные эндпоинты)

```
POST   /auth/register            регистрация
POST   /auth/login               вход
POST   /auth/refresh             обновление токенов
POST   /auth/logout              выход (отзыв refresh-токена)
GET    /auth/me                  текущий пользователь
GET    /users/search?q=          поиск пользователей
POST   /users/avatar             загрузка аватара (multipart)
GET    /chats                    список чатов
POST   /chats/direct             создать личный чат (body: { userId })
GET    /messages/:chatId         история сообщений (?before, ?limit)
POST   /messages/:chatId         отправить сообщение (multipart: body + files[])
PATCH  /messages/:chatId/:msgId  закрепить/открепить (body: { pinned })
DELETE /messages/:chatId/:msgId  удалить своё сообщение
GET    /ws?token=                WebSocket (realtime)
GET    /health                   healthcheck
```

## Безопасность

- Пароли: Argon2id (память 64 МБ, 3 итерации).
- JWT: short-lived access + refresh-ротация, хранится как SHA-256 в БД, отзыв при logout.
- Файлы: валидация по магическим байтам (не по расширению), случайное имя, `X-Content-Type-Options: nosniff`, immutable-кэш.
- HTTP: Helmet (заголовки), CORS allow-list, rate-limit (в т.ч. отдельные лимиты на auth), ограничение размера тела.
- WebSocket: проверка JWT при подключении, heartbeat, отправка только участникам чата.
- Electron: `contextIsolation`, `nodeIntegration: false`, `sandbox: true`, CSP, запрет навигации/внешних окон (открытие через системный браузер), токены шифруются через `safeStorage`.

## Траблшутинг

- **`prisma generate` не скачивает движок/бинaрии** — дождись сети и повтори `npm --workspace server run db:generate`.
- **Electron не стартует в Linux** — обычно не хватает системных библиотек: `sudo apt-get install libgtk-3-0 libnss3 libasound2 libgbm1`.
- **PostgreSQL не поднимается в Docker** — проверь, что порт `5432` свободен, и что `docker compose up -d postgres` отработал.
- **Клиент не видит сервер** — убедись, что `dev:server` запущен на `localhost:3000`; при сборке под прод задай `VITE_API_URL`.
```
