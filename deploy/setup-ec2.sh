#!/usr/bin/env bash
#
# One-time bootstrap for an Amazon Linux 2023 instance that will run blogserver.
# Safe to re-run: every step checks whether it has already been done.
#
#   curl -fsSL https://raw.githubusercontent.com/Kathiravan292/blogserver/main/deploy/setup-ec2.sh | bash
#
# or, once the repo is cloned:
#
#   bash deploy/setup-ec2.sh
#
set -euo pipefail

NODE_MAJOR=22
SWAP_SIZE_MB=2048

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

# --- Swap ------------------------------------------------------------------
# A t2.micro / t3.micro has 1 GB of RAM. `npm ci` followed by a TypeScript build
# reliably exhausts that and the kernel kills the compiler, which shows up as a
# build that dies with no error message. Swap is the fix.
if [[ -f /swapfile ]]; then
  log "Swap file already present, skipping"
else
  log "Creating a ${SWAP_SIZE_MB}MB swap file"
  sudo dd if=/dev/zero of=/swapfile bs=1M count="$SWAP_SIZE_MB" status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# --- Base packages ---------------------------------------------------------
log "Updating packages"
sudo dnf update -y -q

log "Installing git, nginx and build tooling"
sudo dnf install -y -q git nginx gcc-c++ make

# --- Node ------------------------------------------------------------------
if command -v node >/dev/null 2>&1 && [[ "$(node -v)" == v${NODE_MAJOR}.* ]]; then
  log "Node $(node -v) already installed, skipping"
else
  log "Installing Node ${NODE_MAJOR} from NodeSource"
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash -
  sudo dnf install -y -q nodejs
fi

node -v
npm -v

# --- Certbot ---------------------------------------------------------------
if command -v certbot >/dev/null 2>&1; then
  log "Certbot already installed, skipping"
else
  log "Installing certbot"
  sudo dnf install -y -q certbot python3-certbot-nginx
fi

# --- SELinux ---------------------------------------------------------------
# Amazon Linux 2023 ships with SELinux enforcing. Without this boolean, nginx is
# denied the loopback connection to the app and every request returns 502 with
# "Permission denied" in /var/log/nginx/error.log.
if command -v getsebool >/dev/null 2>&1; then
  if [[ "$(getsebool httpd_can_network_connect 2>/dev/null || true)" == *" on" ]]; then
    log "SELinux already allows nginx to proxy, skipping"
  else
    log "Allowing nginx to make outbound connections (SELinux)"
    sudo setsebool -P httpd_can_network_connect 1
  fi
fi

# --- Nginx -----------------------------------------------------------------
log "Enabling nginx"
sudo systemctl enable --now nginx

log "Done. Next: clone the repo, write .env, then run deploy/deploy.sh"
