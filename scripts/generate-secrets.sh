#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example first." >&2
  exit 1
fi

ACCESS="$(openssl rand -base64 48 | tr -d '\n' | tr -d '/+=' | head -c 64)"
REFRESH="$(openssl rand -base64 48 | tr -d '\n' | tr -d '/+=' | head -c 64)"

case "$(uname -s)" in
  darwin) sed -i '' "s/^JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=${ACCESS}/" .env ;;
  *) sed -i "s/^JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=${ACCESS}/" .env ;;
esac

case "$(uname -s)" in
  darwin) sed -i '' "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${REFRESH}/" .env ;;
  *) sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${REFRESH}/" .env ;;
esac

echo "JWT secrets rotated in .env"
