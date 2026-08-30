#!/usr/bin/env bash
# Starts a throwaway local Postgres on localhost:5432 for running the app from Rider.
# Matches ConnectionStrings:Postgres in appsettings.json (spotprice / spotprice / spotprice).
# Separate from the docker-compose db (which is on host 5433), so the two don't collide.
set -euo pipefail

NAME=spotprice-local-db

# If a container by this name already exists, just (re)start it instead of erroring out.
if docker ps -a --format '{{.Names}}' | grep -qx "spotprice-local-db"; then
  echo "Container 'spotprice-local-db' exists — starting it."
  docker start "spotprice-local-db"
  exit 0
fi

echo "Creating and starting 'spotprice-local-db' on localhost:5432..."
docker run -d \
  --name "spotprice-local-db" \
  -e POSTGRES_DB=spotprice \
  -e POSTGRES_USER=spotprice \
  -e POSTGRES_PASSWORD=spotprice123! \
  -p 5432:5432 \
  postgres:17

echo "Done. Connect with: docker exec -it spotprice-local-db psql -U spotprice -d spotprice"
