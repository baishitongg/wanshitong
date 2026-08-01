#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/wanshitong}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
MIGRATE_ATTEMPTS="${MIGRATE_ATTEMPTS:-5}"
MIGRATE_RETRY_SECONDS="${MIGRATE_RETRY_SECONDS:-15}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $APP_DIR/$ENV_FILE"
  echo "Create it from .env.production.example before deploying."
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build app

for attempt in $(seq 1 "$MIGRATE_ATTEMPTS"); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps -T app npx prisma migrate deploy </dev/null; then
    break
  fi

  if [ "$attempt" -eq "$MIGRATE_ATTEMPTS" ]; then
    echo "Prisma migrations failed after $MIGRATE_ATTEMPTS attempts."
    exit 1
  fi

  echo "Prisma migration attempt $attempt failed; retrying in ${MIGRATE_RETRY_SECONDS}s..."
  sleep "$MIGRATE_RETRY_SECONDS"
done

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --remove-orphans
docker image prune -f

docker compose -f "$COMPOSE_FILE" ps
