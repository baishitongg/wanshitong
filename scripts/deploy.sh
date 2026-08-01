#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/wanshitong}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

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
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm app npx prisma migrate deploy
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
docker image prune -f

docker compose -f "$COMPOSE_FILE" ps
