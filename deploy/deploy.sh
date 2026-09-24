#!/usr/bin/env bash
#
# Ships the current main branch to the running instance. Run from the repo root
# on the EC2 box:
#
#   cd ~/blogserver && bash deploy/deploy.sh
#
set -euo pipefail

BRANCH="${1:-main}"
SERVICE=blogserver

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "No .env in $(pwd). Create it before deploying - the app refuses to start without it." >&2
  exit 1
fi

log "Fetching ${BRANCH}"
git fetch --quiet origin "$BRANCH"
git checkout --quiet "$BRANCH"
git reset --hard --quiet "origin/${BRANCH}"
git log --oneline -1

# Dev dependencies are needed to compile, so install everything, build, then drop
# them again to keep the deployed tree small.
log "Installing dependencies"
npm ci --no-audit --no-fund

log "Building"
npm run build

log "Verifying the database connection"
npm run check:db

log "Pruning dev dependencies"
npm prune --omit=dev

log "Restarting ${SERVICE}"
sudo systemctl restart "$SERVICE"
sleep 2
sudo systemctl --no-pager --lines=0 status "$SERVICE"

log "Deployed. Recent logs:"
sudo journalctl -u "$SERVICE" -n 20 --no-pager
