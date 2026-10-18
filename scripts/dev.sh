#!/usr/bin/env bash
# Start local Python wholesale API + Next.js together (Option B).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "Creating .venv…"
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -r requirements-dev.txt
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

cleanup() {
  if [[ -n "${PY_PID:-}" ]] && kill -0 "$PY_PID" 2>/dev/null; then
    kill "$PY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

python scripts/dev_wholesale.py &
PY_PID=$!

# Wait briefly for the API to bind
sleep 0.5

export POWERSAVE_DEV_REWRITE=1
npm run dev
