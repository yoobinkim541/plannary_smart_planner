# Deployment and production debugging

## Deployment roles

Planary has two deployment roles:

- Vercel serves `redesign/` and the serverless handlers under `api/`.
- Firebase provides client authentication, Firestore, Storage, and optionally static hosting.
- The self-hosted Node worker runs periodic e-Class, reminder, request, and wiki OG jobs. It is not a Vercel cron replacement; the GitHub Actions workflow is only a six-hour safety net for e-Class sync.

Firebase Hosting alone cannot serve the Express/Vercel handlers because `firebase.json` has no `/api/**` rewrite. A Firebase-only deployment will therefore load the UI but e-Class, account, and reminder APIs will fail. Use the Vercel/API origin or add a separately managed API proxy before choosing Firebase Hosting as the public origin.

## Required secrets

Set these in the Vercel Production environment:

```text
FIREBASE_SERVICE_ACCOUNT_KEY
ECLASS_ENCRYPTION_KEY
CRON_SECRET
```

`FIREBASE_SERVICE_ACCOUNT_KEY` is the Firebase Admin service-account JSON as one secret value. The split alternative is `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Do not use a local file path in Vercel.

The worker needs the same `ECLASS_ENCRYPTION_KEY` used by Vercel so it can decrypt saved e-Class credentials. It can load Firebase Admin credentials from `FIREBASE_SERVICE_ACCOUNT_PATH` (normally `worker/serviceAccount.json`) or `FIREBASE_SERVICE_ACCOUNT_KEY`.

## Files that must stay local

These are deliberately ignored and must not be generated for Git collaboration:

```text
.vercel/
.design-tmp/
node_modules/
.env
logs/
worker/serviceAccount.json
```

Run `vercel link` separately on each machine to create `.vercel/`. Provision service-account JSON through the host secret manager or copy it to the worker host with mode `600`; never put it in a PR. `AGENTS.md`, `claude.md`, and `.env.example` are the files intended to be shared.

## First deployment

```bash
npm ci
npm run build:redesign
vercel link
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production
vercel env add ECLASS_ENCRYPTION_KEY production
vercel env add CRON_SECRET production
vercel deploy --prod
```

The Vercel CLI is optional for contributors but is required for these commands. Install it with `npm i -g vercel` only on machines that will manage Vercel deployments. Do not commit the generated `.vercel/` directory.

For the self-hosted server, follow `server/setup-oracle.sh` and then verify both services:

```bash
sudo systemctl status planary-api planary-eclass-worker
node worker/diagnose.js
sudo journalctl -u planary-api -n 100 --no-pager
sudo journalctl -u planary-eclass-worker -n 100 --no-pager
```

## Release verification

Run the focused tests and build locally:

```bash
node api/eclass/parser.test.js
node redesign/profile-bridge.test.js
node redesign/firestore-contract.test.js
npm run build:redesign
```

Then check these boundaries in the deployed environment:

1. `/redesign/` loads without a console error.
2. Authenticated requests to `/api/eclass/connection` return a controlled response rather than a 500.
3. An unauthenticated request to `/api/notifications/check-reminders` returns `401`.
4. A newly connected e-Class account appears in `worker/diagnose.js` and reaches `syncStatus: ok`.
5. `serviceAccount.json`, `.env`, and `/logs/` are not publicly retrievable.

If a sync is pending, inspect the connection document's `syncStatus`, `lastError`, `lastSyncStartedAt`, and `lastSyncedAt` before changing code. This separates credential/login failures from a stopped worker.
