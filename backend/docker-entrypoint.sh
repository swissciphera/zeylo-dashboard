#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

# Platform settings are ensured by the app on boot (PlatformSettingsService),
# so no separate ts-node seed step is needed at runtime.

echo "Starting Zeylo API..."
exec node dist/main.js
