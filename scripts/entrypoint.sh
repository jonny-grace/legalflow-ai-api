#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
# Prisma 7: reads DATABASE_URL from prisma.config.ts at runtime
node_modules/.bin/prisma migrate deploy

echo "▶ Starting application..."
exec node dist/main