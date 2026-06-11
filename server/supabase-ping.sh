#!/usr/bin/env bash
# Pings Supabase REST API to prevent free-tier auto-pause (pauses after 7 days inactivity).
#
# Cron (every 3 days at 09:00 UTC):
#   0 9 */3 * * planary /opt/planary/app/server/supabase-ping.sh >> /var/log/planary/supabase-ping.log 2>&1
#
# Requires in /opt/planary/app/.env:
#   SUPABASE_URL=https://xxxx.supabase.co
#   SUPABASE_ANON_KEY=eyJ...

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL not set in .env}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY not set in .env}"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  --max-time 10)

echo "[supabase-ping] $(date -u +%Y-%m-%dT%H:%M:%SZ) HTTP ${HTTP}"

if [ "$HTTP" != "200" ]; then
  echo "[supabase-ping] WARNING: unexpected status ${HTTP}" >&2
  exit 1
fi
