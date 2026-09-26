# Planary collaboration guide

## Source of truth

- The production web app is `redesign/`; edit `redesign/src/` and rebuild with `npm run build:redesign`.
- Do not edit `redesign/dist/` by hand. The generated bundles are committed because the static deployment serves them directly.
- The Vercel deployment serves the web app and `api/` handlers. Firebase supplies Auth, Firestore, Storage, and the static hosting option.
- Firebase Hosting by itself does not proxy `/api/*`; use the Vercel/API deployment for e-Class and account APIs.

## Local setup

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and fill in local values only.
3. Run `npm run build:redesign` after source changes.
4. Run `npm run serve` for the Express deployment-shaped local server.

The browser Firebase configuration in `firebase-init.js` is public client configuration. Firebase Admin credentials, `ECLASS_ENCRYPTION_KEY`, and `CRON_SECRET` are server secrets and must stay outside Git.

## Verification

Run these focused checks before opening or updating a PR:

```text
node api/eclass/parser.test.js
node redesign/profile-bridge.test.js
node redesign/firestore-contract.test.js
npm run build:redesign
```

For deployment-shaped checks, confirm that `/redesign/` loads, the API returns a response under `/api/`, and the worker diagnose command can initialize Firebase without printing credential contents.

## Secrets and generated files

Do not create or commit `.env`, `.vercel/`, `.design-tmp/`, `node_modules/`, `logs/`, or any `serviceAccount.json`. Each collaborator provisions those locally or through the deployment secret manager. `AGENTS.md`, `claude.md`, and `.env.example` are the shareable project guidance/templates.

## Production changes

- Set `FIREBASE_SERVICE_ACCOUNT_KEY`, `ECLASS_ENCRYPTION_KEY`, and `CRON_SECRET` in the Vercel Production environment before using server APIs.
- The self-hosted worker must use the same `ECLASS_ENCRYPTION_KEY` as Vercel and a Firebase Admin service account with Firestore access.
- Run `node worker/diagnose.js` on the worker host after deploy. Inspect `journalctl -u planary-api` and `journalctl -u planary-eclass-worker` for failures.
- Never paste production secrets into issues, PRs, logs, or this repository.
