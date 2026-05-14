#!/usr/bin/env node

(function loadEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    text.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq < 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    });
  } catch (error) {
    console.error('[worker] failed to load .env:', error.message);
  }
})();

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

function initFirebase() {
  if (admin.apps.length) return;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccount.json');
  if (fs.existsSync(keyPath)) {
    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return;
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  }
  const { getAdmin } = require('../api/eclass/_admin');
  getAdmin();
}

initFirebase();

const { syncAll } = require('../api/eclass/sync-core');
const { reminderTick } = require('./reminder-tick');
const { requestTick } = require('./request-tick');
const { wikiOgTick } = require('./wiki-og-tick');

const TICK_MS = Number(process.env.WORKER_INTERVAL_MS) || 5 * 60 * 1000;
const REMINDER_TICK_MS = Number(process.env.REMINDER_INTERVAL_MS) || 60 * 1000;
const REQUEST_TICK_MS = Number(process.env.REQUEST_INTERVAL_MS) || 15 * 1000;
const WIKI_OG_TICK_MS = Number(process.env.WIKI_OG_INTERVAL_MS) || 2 * 60 * 1000;
const ONCE = process.argv.includes('--once');

let syncRunning = false;
async function tick() {
  if (syncRunning) {
    console.log('[worker] previous sync tick still running, skipping');
    return;
  }
  syncRunning = true;
  const startedAt = Date.now();
  try {
    const result = await syncAll();
    console.log(`[worker] sync ok todos=${result.todoCount} exams=${result.examCount} in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error('[worker] sync failed:', error.stack || error.message || error);
  } finally {
    syncRunning = false;
  }
}

let reminderRunning = false;
async function reminders() {
  if (reminderRunning) return;
  reminderRunning = true;
  const startedAt = Date.now();
  try {
    const result = await reminderTick();
    if (result.firedCount > 0) {
      console.log(`[worker] reminder ok fired=${result.firedCount} in ${Date.now() - startedAt}ms`);
    }
  } catch (error) {
    console.error('[worker] reminder failed:', error.stack || error.message || error);
  } finally {
    reminderRunning = false;
  }
}

let requestRunning = false;
async function requests() {
  if (requestRunning) return;
  requestRunning = true;
  const startedAt = Date.now();
  try {
    const result = await requestTick();
    if (result.processed > 0) {
      console.log(`[worker] requests ok processed=${result.processed} in ${Date.now() - startedAt}ms`);
    }
  } catch (error) {
    console.error('[worker] requests failed:', error.stack || error.message || error);
  } finally {
    requestRunning = false;
  }
}

let wikiOgRunning = false;
async function wikiOg() {
  if (wikiOgRunning) return;
  wikiOgRunning = true;
  const startedAt = Date.now();
  try {
    const result = await wikiOgTick();
    if (result.processed > 0) {
      console.log(`[worker] wiki-og ok processed=${result.processed} filled=${result.filled} in ${Date.now() - startedAt}ms`);
    }
  } catch (error) {
    console.error('[worker] wiki-og failed:', error.stack || error.message || error);
  } finally {
    wikiOgRunning = false;
  }
}

(async () => {
  await tick();
  await reminders();
  await requests();
  await wikiOg();
  if (ONCE) {
    process.exit(0);
  }
  setInterval(tick, TICK_MS);
  setInterval(reminders, REMINDER_TICK_MS);
  setInterval(requests, REQUEST_TICK_MS);
  setInterval(wikiOg, WIKI_OG_TICK_MS);
  console.log(`[worker] scheduled sync=${TICK_MS / 1000}s reminders=${REMINDER_TICK_MS / 1000}s requests=${REQUEST_TICK_MS / 1000}s wiki-og=${WIKI_OG_TICK_MS / 1000}s`);
})();

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
