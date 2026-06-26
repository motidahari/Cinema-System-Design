#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SERVICE_DIR="${1:-}"
SERVICE_PORT="${2:-}"

if [[ -z "$SERVICE_DIR" || -z "$SERVICE_PORT" ]]; then
    echo "usage: $0 <service-dir> <port>" >&2
    exit 1
fi

# Keep the generated dist for workspace libraries fresh before launching the
# Nest process. nodemon restarts this script on source changes, so every restart
# picks up service code and shared package changes.
cd "$ROOT"
npm run build --workspace @cinema/internal-sdk
npm run build --workspace @cinema/shared

cd "$ROOT/$SERVICE_DIR"
PORT="$SERVICE_PORT" exec node --require ts-node/register --require tsconfig-paths/register src/main.ts
