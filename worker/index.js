#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env (key=value lines, # comments). No dotenv dep — keeps the worker self-contained.
(() => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
})();

// Funnel the on-disk service-account file into the env var that _admin.getAdmin() already
// understands. One init path for both Vercel and the worker.
const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccount.json');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && fs.existsSync(keyPath)) {
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = fs.readFileSync(keyPath, 'utf8');
}

const { getAdmin } = require('../api/eclass/_admin');
getAdmin(); // throws early if credentials are missing — better than a cryptic Firestore error later

const { syncAll } = require('../api/eclass/sync-core');

const TICK_MS = Number(process.env.WORKER_INTERVAL_MS) || 5 * 60 * 1000;
const ONCE = process.argv.includes('--once');

let running = false;
async function tick() {
  if (running) return console.log('[worker] previous tick still running, skipping');
  running = true;
  const startedAt = Date.now();
  try {
    const { todoCount, examCount } = await syncAll();
    console.log(`[worker] tick ok todos=${todoCount} exams=${examCount} in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error('[worker] tick failed:', error.stack || error.message || error);
  } finally {
    running = false;
  }
}

tick().then(() => {
  if (ONCE) return process.exit(0);
  setInterval(tick, TICK_MS);
  console.log(`[worker] scheduled every ${TICK_MS / 1000}s`);
});
