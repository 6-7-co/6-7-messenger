#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Creating project structure"
mkdir -p \
  scripts \
  server/src/config \
  server/src/modules/auth \
  server/src/modules/users \
  server/src/modules/chats \
  server/src/modules/messages \
  server/src/modules/uploads \
  server/src/modules/ws \
  server/src/plugins \
  server/src/utils \
  server/prisma \
  client/src/main \
  client/src/preload \
  client/src/renderer/src/api \
  client/src/renderer/src/components \
  client/src/renderer/src/store \
  client/src/renderer/src/styles \
  infra/k8s \
  storage/uploads

echo "==> Preparing environment"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    Copied .env.example -> .env (set real secrets before deploying)"
else
  echo "    .env already exists, skipping"
fi

echo "==> Installing dependencies (npm workspaces)"
npm install

echo "==> Generating Prisma client"
npm --workspace server run db:generate

echo "==> Starting PostgreSQL (docker compose)"
docker compose up -d postgres

echo "==> Waiting for PostgreSQL to be healthy"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U messenger -d messenger >/dev/null 2>&1; then
    echo "    PostgreSQL is ready"
    break
  fi
  sleep 1
done

echo "==> Applying schema (prisma db push)"
npm --workspace server run db:push

echo "==> Seeding initial users alex/kent"
npm --workspace server run db:seed

echo ""
echo "Done. Next:"
echo "  npm run dev:server   # API + WebSocket at http://localhost:3000"
echo "  npm run dev:client   # Electron app"
echo ""
echo "Logins seeded:"
echo "  alex / alex-password (you)"
echo "  kent / kent-password (friend)"
