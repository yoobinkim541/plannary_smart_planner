#!/usr/bin/env bash
# One-shot Oracle (Ubuntu 22.04 ARM) setup for Planary.
# Idempotent — safe to re-run after partial failures.
#
# Usage:
#   1. SSH into the Oracle instance as ubuntu (or root).
#   2. git clone <repo-url> /tmp/planary-setup && bash /tmp/planary-setup/server/setup-oracle.sh
#
# After this script finishes you still need to:
#   a) Fill in /opt/planary/app/.env  (see .env.template below)
#   b) Replace YOUR_DOMAIN in /etc/nginx/sites-available/planary
#   c) Run: sudo certbot --nginx -d YOUR_DOMAIN
#   d) sudo systemctl reload nginx

set -euo pipefail

REPO_URL="${PLANARY_REPO_URL:-}"   # e.g. git@github.com:you/planary.git
APP_DIR="/opt/planary/app"
SVC_USER="planary"

# ── 1. System packages ────────────────────────────────────────────────────────
echo "==> Installing system packages"
sudo apt-get update -qq
sudo apt-get install -y -qq git curl nginx certbot python3-certbot-nginx

# Node.js 20 LTS
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.version.split(".")[0].slice(1))')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "  node $(node --version)  npm $(npm --version)"

# ── 2. Service user ───────────────────────────────────────────────────────────
echo "==> Creating service user '${SVC_USER}'"
if ! id "$SVC_USER" &>/dev/null; then
  sudo useradd --system --create-home --shell /usr/sbin/nologin "$SVC_USER"
fi

# ── 3. Clone / update repo ────────────────────────────────────────────────────
echo "==> Setting up repo at ${APP_DIR}"
sudo mkdir -p "$APP_DIR"
sudo chown "$SVC_USER:$SVC_USER" "$APP_DIR"

if [ -d "${APP_DIR}/.git" ]; then
  echo "  repo exists — pulling latest"
  sudo -u "$SVC_USER" git -C "$APP_DIR" pull --ff-only
else
  if [ -z "$REPO_URL" ]; then
    echo "ERROR: set PLANARY_REPO_URL env var before running this script" >&2
    exit 1
  fi
  sudo -u "$SVC_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# ── 4. npm install ────────────────────────────────────────────────────────────
echo "==> Installing npm dependencies"
sudo -u "$SVC_USER" npm --prefix "$APP_DIR" install --omit=dev
sudo -u "$SVC_USER" npm --prefix "$APP_DIR/worker" install

# ── 5. Log directory ──────────────────────────────────────────────────────────
echo "==> Creating log directory"
sudo mkdir -p /var/log/planary
sudo chown "$SVC_USER:$SVC_USER" /var/log/planary

# ── 6. .env template ──────────────────────────────────────────────────────────
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "==> Writing .env template — FILL IN VALUES before starting services"
  sudo -u "$SVC_USER" tee "${APP_DIR}/.env" > /dev/null <<'ENV'
# Shared by server.js (API) and worker/index.js
# Copy values from Vercel project settings → Environment Variables

# Firebase Admin credentials (one of the two options below)
# Option A: inline JSON (escape newlines with \n)
FIREBASE_SERVICE_ACCOUNT_KEY=

# Option B: path to service account JSON file
# FIREBASE_SERVICE_ACCOUNT_PATH=/opt/planary/app/serviceAccount.json

# E-class encryption key (must match Vercel)
ECLASS_ENCRYPTION_KEY=

# Cron auth secret (must match Vercel)
CRON_SECRET=

# Supabase keep-alive (only needed if you have a separate Supabase project)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Hermes agent error webhook (optional)
HERMES_ERROR_WEBHOOK=

# API server bind (default: 127.0.0.1:3000)
# API_PORT=3000
# API_HOST=127.0.0.1
ENV
  sudo chmod 600 "${APP_DIR}/.env"
fi

# ── 7. systemd — API server ───────────────────────────────────────────────────
echo "==> Installing planary-api systemd unit"
sudo cp "${APP_DIR}/server/planary-api.service" /etc/systemd/system/
sudo sed -i "s|/opt/planary/app|${APP_DIR}|g" /etc/systemd/system/planary-api.service

# ── 8. systemd — worker (if not already installed) ───────────────────────────
echo "==> Installing planary-eclass-worker systemd unit"
sudo cp "${APP_DIR}/worker/planary-eclass-worker.service" /etc/systemd/system/
sudo sed -i "s|/opt/planary/worker|${APP_DIR}/worker|g"  /etc/systemd/system/planary-eclass-worker.service
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=${APP_DIR}/worker|g" /etc/systemd/system/planary-eclass-worker.service
# Both services share the same root .env
sudo sed -i "s|EnvironmentFile=.*|EnvironmentFile=${APP_DIR}/.env|g" /etc/systemd/system/planary-eclass-worker.service

sudo systemctl daemon-reload
sudo systemctl enable planary-api planary-eclass-worker

# ── 9. nginx ──────────────────────────────────────────────────────────────────
echo "==> Configuring nginx"
sudo cp "${APP_DIR}/server/nginx.conf" /etc/nginx/sites-available/planary
sudo mkdir -p /var/www/certbot
if [ ! -L /etc/nginx/sites-enabled/planary ]; then
  sudo ln -s /etc/nginx/sites-available/planary /etc/nginx/sites-enabled/planary
fi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ── 10. cron — Supabase ping ──────────────────────────────────────────────────
echo "==> Adding Supabase ping cron"
chmod +x "${APP_DIR}/server/supabase-ping.sh"
CRON_LINE="0 9 */3 * * ${SVC_USER} ${APP_DIR}/server/supabase-ping.sh >> /var/log/planary/supabase-ping.log 2>&1"
CRON_FILE="/etc/cron.d/planary-supabase-ping"
if ! grep -qF "supabase-ping.sh" "$CRON_FILE" 2>/dev/null; then
  echo "$CRON_LINE" | sudo tee "$CRON_FILE" > /dev/null
  sudo chmod 644 "$CRON_FILE"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Setup complete. Next steps:"
echo ""
echo "  1. Fill in ${APP_DIR}/.env"
echo "  2. Edit /etc/nginx/sites-available/planary → replace YOUR_DOMAIN"
echo "  3. sudo certbot --nginx -d YOUR_DOMAIN"
echo "  4. sudo systemctl start planary-api planary-eclass-worker"
echo "  5. sudo systemctl reload nginx"
echo "  6. sudo journalctl -u planary-api -f   # watch logs"
echo ""
echo "  To update later:"
echo "  sudo -u ${SVC_USER} git -C ${APP_DIR} pull"
echo "  sudo -u ${SVC_USER} npm --prefix ${APP_DIR} install --omit=dev"
echo "  sudo systemctl restart planary-api planary-eclass-worker"
