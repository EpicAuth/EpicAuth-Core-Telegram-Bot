#!/bin/sh
set -e

echo "epicauth-bot: applying database migrations"
bun run db:deploy

echo "epicauth-bot: starting"
exec "$@"