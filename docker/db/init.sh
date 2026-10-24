#!/bin/bash
# Runs once, when the Postgres data volume is empty (the official image only
# executes /docker-entrypoint-initdb.d on first initialisation). Builds the
# schema from the Drizzle migrations, in order, then loads sample data.
set -euo pipefail

run_sql() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$1"
}

for migration in /migrations/*.sql; do
  echo "Applying migration $(basename "$migration")"
  run_sql "$migration"
done

echo "Seeding sample data"
run_sql /seed/seed.sql
