#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x backend/node_modules/.bin/nodemon ] || [ ! -x frontend/node_modules/.bin/vite ]; then
  echo "Dependencies are missing. First run: (cd backend && npm ci) and (cd frontend && npm ci)"
  exit 1
fi

# Avoid silently starting a different frontend on ports 5174, 5175, etc.
if command -v lsof >/dev/null 2>&1; then
  for PORT_TO_CHECK in 3000 5173; do
    if lsof -nP -iTCP:"$PORT_TO_CHECK" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $PORT_TO_CHECK is already in use. Stop the old BudgetNest Terminal before starting again."
      exit 1
    fi
  done
fi

echo "Starting BudgetNest backend (:3000) and frontend (:5173)."
echo "Open http://localhost:5173/login"
echo "Press Control+C to stop both servers."

(cd backend && exec ./node_modules/.bin/nodemon src/server.js) &
BACKEND_PID=$!
(cd frontend && exec ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort) &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait "$BACKEND_PID"
