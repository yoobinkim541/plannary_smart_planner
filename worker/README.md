# Planary e-class worker

Self-hosted background process that runs every 5 minutes and:

1. Calls `syncAll()` from `api/eclass/sync-core.js` to refresh e-class todos for every connected user.
2. Discovers each course's 강의계획서 (HTML or PDF), parses 중간고사 / 기말고사 / 발표 / 프로젝트 등 큰 일정의 날짜, and mirrors them into the user's `todos` collection as `source: 'eclass-exam'`.

It writes directly to Firestore using a Firebase Admin service account — no Vercel cron involved.

## One-time setup on the Ubuntu server

```bash
# 1) Install Node.js 20 + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2) Create a dedicated user
sudo useradd --system --create-home --shell /usr/sbin/nologin planary

# 3) Place the repo
sudo mkdir -p /opt/planary
sudo chown planary:planary /opt/planary
sudo -u planary git clone <repo-url> /opt/planary/app
cd /opt/planary/app/worker
sudo -u planary npm install
# Also install the parent dependencies that sync-core/_syllabus import:
cd /opt/planary/app
sudo -u planary npm install --omit=dev

# 4) Drop the two secret files into /opt/planary/app/worker/
#    serviceAccount.json — Firebase Admin SDK key (Firebase Console → Project Settings → Service accounts)
#    .env               — see template below
sudo -u planary nano /opt/planary/app/worker/serviceAccount.json
sudo -u planary nano /opt/planary/app/worker/.env
sudo chmod 600 /opt/planary/app/worker/serviceAccount.json /opt/planary/app/worker/.env

# 5) Install the systemd unit
sudo cp /opt/planary/app/worker/planary-eclass-worker.service /etc/systemd/system/
# Adjust WorkingDirectory inside the unit if you used a different path.
sudo sed -i 's|/opt/planary/worker|/opt/planary/app/worker|g' /etc/systemd/system/planary-eclass-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now planary-eclass-worker

# 6) Watch the logs
sudo journalctl -u planary-eclass-worker -f
```

### `.env` template

```dotenv
# Must match the value used by Vercel (same key that encrypted the saved credentials)
ECLASS_ENCRYPTION_KEY=<copy-from-vercel>

# Optional override; defaults to 5 minutes
# WORKER_INTERVAL_MS=300000

# Optional path override; defaults to ./serviceAccount.json
# FIREBASE_SERVICE_ACCOUNT_PATH=/opt/planary/app/worker/serviceAccount.json
```

> `ECLASS_ENCRYPTION_KEY` is what the worker uses to decrypt the saved e-class
> usernames/passwords stored by `/api/eclass/connection.js`. If it doesn't match
> the value on Vercel, you'll see `Missing saved E-class credentials` or
> decryption errors in the logs.

## Local dry run

```bash
cd worker
npm install
# Run a single sync cycle and exit
node index.js --once
```

## Updating

```bash
sudo -u planary git -C /opt/planary/app pull
sudo -u planary npm --prefix /opt/planary/app install --omit=dev
sudo -u planary npm --prefix /opt/planary/app/worker install
sudo systemctl restart planary-eclass-worker
```

## How it relates to the rest of the system

- The Vercel endpoints `/api/eclass/connection` (save credentials) and
  `/api/eclass/sync` (manual trigger from the PWA) keep working unchanged —
  they call the same `sync-core.js` module.
- The GitHub Actions cron (`.github/workflows/eclass-sync.yml`) is downgraded
  to a 6-hour safety net in case the worker is down.
- The PWA's in-tab 5-minute foreground polling also keeps working.
