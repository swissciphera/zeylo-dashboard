#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding platform settings (idempotent)..."
npx prisma db seed || echo "Seed skipped/failed (non-fatal)."

echo "Starting Zeylo API..."
exec node dist/main.js
