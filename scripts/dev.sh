#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

mkdir -p uploads/avatars uploads/logos

if [ ! -d "frontend/node_modules" ]; then
  echo "[dev] Installing frontend dependencies..."
  (cd frontend && npm install)
fi

BACKEND_PID=""
FRONTEND_PID=""
CLEANED_UP=0

terminate_tree() {
  local pid="$1"
  if [ -z "${pid}" ] || ! kill -0 "${pid}" 2>/dev/null; then
    return
  fi

  local children
  children="$(pgrep -P "${pid}" 2>/dev/null || true)"
  for child in ${children}; do
    terminate_tree "${child}"
  done
  kill -TERM "${pid}" 2>/dev/null || true
}

cleanup() {
  if [ "${CLEANED_UP}" -eq 1 ]; then
    return
  fi
  CLEANED_UP=1
  echo ""
  echo "[dev] Stopping HR Management dev servers..."
  terminate_tree "${FRONTEND_PID}"
  terminate_tree "${BACKEND_PID}"
  wait 2>/dev/null || true
  echo "[dev] Dev servers stopped."
}

trap cleanup INT TERM EXIT

echo "[dev] Starting Spring Boot backend (APP_SEED_ENABLED=${APP_SEED_ENABLED:-true})..."
APP_SEED_ENABLED="${APP_SEED_ENABLED:-true}" ./mvnw spring-boot:run &
BACKEND_PID=$!

echo "[dev] Starting Vite frontend on http://localhost:5173..."
(cd frontend && npm run dev -- --port 5173) &
FRONTEND_PID=$!

echo "[dev] Waiting for Spring Boot on http://localhost:8080..."
backend_ready=0
for _ in $(seq 1 90); do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    echo "[dev] Spring Boot process exited before becoming ready." >&2
    exit 1
  fi
  if curl -sf "http://localhost:8080/v3/api-docs" >/dev/null 2>&1; then
    backend_ready=1
    break
  fi
  sleep 1
done

echo ""
echo "=================================================="
echo " HR Management Dev Environment"
echo " Frontend : http://localhost:5173"
echo " Backend  : http://localhost:8080"
echo " Swagger  : http://localhost:8080/swagger-ui.html"
if [ "${backend_ready}" -eq 0 ]; then
  echo " Status   : Backend still starting (check logs above)"
else
  echo " Status   : Backend & Frontend ready"
fi
echo " Press Ctrl+C to stop both servers cleanly."
echo "=================================================="
echo ""

wait
