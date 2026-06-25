#!/usr/bin/env bash
# =============================================================================
# Cinema Reservation System — local dev runner
#
# Brings up the whole local stack with one command:
#   - Postgres (Docker)            cinema-db
#   - identity-service             http://localhost:3001
#   - cinema-service               http://localhost:3002
#   - cinema-app (frontend/Vite)   http://localhost:5173
#
# Usage:
#   npm run dev        (or ./scripts/dev.sh)   start the full stack
#   npm run dev:stop   (or ./scripts/dev.sh --stop)   stop services + DB container
#   npm run dev:logs   (or ./scripts/dev.sh --logs)   tail all service logs
#
# B37 (docker-compose) will eventually replace this script with `docker compose up`.
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[dev]${NC}  $*"; }
success() { echo -e "${GREEN}[dev]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[dev]${NC}  $*"; }
error()   { echo -e "${RED}[dev]${NC}  $*" >&2; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS_FILE="$ROOT/.dev-pids"

# ── Config ────────────────────────────────────────────────────────────────────
DB_CONTAINER="cinema-db"
DB_USER="cinema_user"
DB_PASS="cinema_pass"
DB_NAME="cinema_db"
DB_PORT=5432

# ── --stop ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--stop" ]]; then
    info "Stopping background services..."
    if [[ -f "$PIDS_FILE" ]]; then
        while IFS= read -r pid; do
            kill "$pid" 2>/dev/null && info "Killed PID $pid" || true
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi
    docker stop "$DB_CONTAINER" 2>/dev/null && info "Stopped DB container" || true
    success "Done."
    exit 0
fi

# ── --logs ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--logs" ]]; then
    if [[ ! -f "$PIDS_FILE" ]]; then
        error "No running services found. Run ./scripts/dev.sh first."
        exit 1
    fi
    # tail all log files in parallel
    tail -f "$ROOT"/logs/*.log 2>/dev/null || warn "No log files yet."
    exit 0
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v docker  &>/dev/null || { error "Docker is not installed or not running."; exit 1; }
command -v node    &>/dev/null || { error "Node.js is not installed."; exit 1; }
command -v npm     &>/dev/null || { error "npm is not installed."; exit 1; }
command -v psql    &>/dev/null || PSQL_AVAILABLE=false || PSQL_AVAILABLE=true

mkdir -p "$ROOT/logs"

# ── 1. Postgres ───────────────────────────────────────────────────────────────
info "Checking Postgres container..."

if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    success "Postgres already running."
elif docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    info "Restarting existing Postgres container..."
    docker start "$DB_CONTAINER"
else
    info "Starting new Postgres container..."
    docker run -d \
        --name "$DB_CONTAINER" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASS" \
        -e POSTGRES_DB="$DB_NAME" \
        -p "${DB_PORT}:5432" \
        --health-cmd "pg_isready -U $DB_USER" \
        --health-interval 3s \
        --health-timeout 5s \
        --health-retries 10 \
        postgres:15-alpine
fi

# Wait for Postgres to be ready
info "Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
    if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -q 2>/dev/null; then
        success "Postgres is ready."
        break
    fi
    if [[ $i -eq 30 ]]; then
        error "Postgres did not become ready in time."
        exit 1
    fi
    sleep 1
done

# ── 2. Create schemas ─────────────────────────────────────────────────────────
info "Ensuring DB schemas exist..."

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -c "
    CREATE SCHEMA IF NOT EXISTS identity;
" && success "Schema 'identity' ready."

# ── ADD NEW SERVICE SCHEMAS HERE ──────────────────────────────────────────────
# cinema-service (B16+):
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q -c "
    CREATE SCHEMA IF NOT EXISTS cinema;
" && success "Schema 'cinema' ready."
# ─────────────────────────────────────────────────────────────────────────────

# ── 3. Install workspace dependencies ─────────────────────────────────────────
if [[ ! -d "$ROOT/node_modules" ]]; then
    info "Installing workspace dependencies..."
    npm install --prefix "$ROOT"
fi

# ── 4. Build the internal SDK ─────────────────────────────────────────────────
SDK_DIR="$ROOT/backend-services/libs/core/sdk"
SDK_DIST="$SDK_DIR/dist/index.js"

if [[ ! -f "$SDK_DIST" ]]; then
    info "Building @cinema/internal-sdk..."
    npm run build --prefix "$SDK_DIR"
    success "SDK built."
else
    success "SDK already built."
fi

# ── 5. Start identity-service ─────────────────────────────────────────────────
IDENTITY_DIR="$ROOT/backend-services/identity-service"
IDENTITY_ENV="$IDENTITY_DIR/.env"

if [[ ! -f "$IDENTITY_ENV" ]]; then
    warn ".env not found for identity-service — copying from .env.example"
    cp "$ROOT/.env.example" "$IDENTITY_ENV"
    warn "Edit $IDENTITY_ENV and set JWT_SECRET before running again."
    exit 1
fi

info "Starting identity-service (port 3001)..."
npm run start:dev --prefix "$IDENTITY_DIR" \
    >> "$ROOT/logs/identity-service.log" 2>&1 &

IDENTITY_PID=$!
echo "$IDENTITY_PID" > "$PIDS_FILE"
success "identity-service started (PID $IDENTITY_PID) → logs/identity-service.log"

# ── 5b. Start cinema-service ──────────────────────────────────────────────────
CINEMA_DIR="$ROOT/backend-services/cinema-service"
CINEMA_ENV="$CINEMA_DIR/.env"

if [[ ! -f "$CINEMA_ENV" ]]; then
    warn ".env not found for cinema-service — copying from .env.example"
    cp "$ROOT/.env.example" "$CINEMA_ENV"
fi

info "Starting cinema-service (port 3002)..."
PORT=3002 npm run start:dev --prefix "$CINEMA_DIR" \
    >> "$ROOT/logs/cinema-service.log" 2>&1 &
CINEMA_PID=$!
echo "$CINEMA_PID" >> "$PIDS_FILE"
success "cinema-service started (PID $CINEMA_PID) → logs/cinema-service.log"

# ── 5c. Start frontend (cinema-app) ───────────────────────────────────────────
FRONTEND_DIR="$ROOT/frontend-application/cinema-app"

info "Starting cinema-app (port 5173)..."
npm run dev --prefix "$FRONTEND_DIR" \
    >> "$ROOT/logs/cinema-app.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PIDS_FILE"
success "cinema-app started (PID $FRONTEND_PID) → logs/cinema-app.log"

# ── 6. Health checks ──────────────────────────────────────────────────────────
wait_for_health() {
    local name="$1" url="$2" pid="$3" log="$4"
    info "Waiting for $name to be healthy..."
    for _ in $(seq 1 30); do
        if curl -sf "$url" > /dev/null 2>&1; then
            success "$name is up → ${url%/api/v1/health}"
            return 0
        fi
        if ! kill -0 "$pid" 2>/dev/null; then
            error "$name crashed. Check $log"
            return 1
        fi
        sleep 1
    done
    warn "$name did not pass its health check in time — check $log"
}

wait_for_health "identity-service" "http://localhost:3001/api/v1/health" "$IDENTITY_PID" "logs/identity-service.log" || true
wait_for_health "cinema-service"   "http://localhost:3002/api/v1/health" "$CINEMA_PID"   "logs/cinema-service.log"   || true

echo ""
success "=============================="
success "  Dev environment is running  "
success "=============================="
echo ""
echo -e "  ${BLUE}cinema-app${NC}        →  http://localhost:5173"
echo -e "  ${BLUE}identity-service${NC}  →  http://localhost:3001"
echo -e "  ${BLUE}cinema-service${NC}    →  http://localhost:3002"
echo ""
echo -e "  ${YELLOW}Logs${NC}  →  tail -f logs/*.log   (or: npm run dev:logs)"
echo -e "  ${YELLOW}Stop${NC}  →  npm run dev:stop"
echo ""
