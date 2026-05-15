#!/usr/bin/env node
// Quick health check for the Planary e-class worker.
// Run on the Ubuntu server with:  node worker/diagnose.js
//
// Prints:
//   1) Whether Firebase Admin credentials load
//   2) All eclass_connections with their last sync timestamp, status, and error
//   3) A pass/fail summary for "is the worker actually doing work?"

const fs = require('fs');
const path = require('path');

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

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccount.json');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && fs.existsSync(keyPath)) {
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = fs.readFileSync(keyPath, 'utf8');
}

function fmt(ts) {
  if (!ts) return 'never';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : (ts._seconds ? ts._seconds * 1000 : Number(ts));
  if (!ms) return 'never';
  const d = new Date(ms);
  const ageMs = Date.now() - ms;
  const ageMin = Math.round(ageMs / 60000);
  return `${d.toISOString()} (${ageMin} min ago)`;
}

(async () => {
  console.log('\n=== Planary e-class worker diagnose ===\n');

  // 1) Credentials
  try {
    const { getAdmin } = require('../api/eclass/_admin');
    const admin = getAdmin();
    console.log('[ok] Firebase Admin initialized');

    // 2) Eclass connections
    const db = admin.firestore();
    const snap = await db.collection('eclass_connections').get();
    console.log(`[ok] Found ${snap.size} eclass_connection document(s)\n`);

    let healthy = 0;
    let stuck = 0;
    snap.docs.forEach(doc => {
      const d = doc.data();
      const lastSyncedMs = d.lastSyncedAt?.toMillis?.() || 0;
      const lastStartedMs = d.lastSyncStartedAt?.toMillis?.() || 0;
      const ageMin = lastSyncedMs ? Math.round((Date.now() - lastSyncedMs) / 60000) : Infinity;
      const status = d.syncStatus || '(none)';

      const sm = d.lastSyllabusMetrics || {};
      console.log(`uid=${doc.id}`);
      console.log(`  enabled       : ${d.enabled === true}`);
      console.log(`  syncStatus    : ${status}`);
      console.log(`  lastSyncedAt  : ${fmt(d.lastSyncedAt)}`);
      console.log(`  lastStartedAt : ${fmt(d.lastSyncStartedAt)}`);
      console.log(`  lastTodoCount : ${d.lastTodoCount ?? d.lastItemCount ?? '-'}`);
      console.log(`  lastExamCount : ${d.lastExamCount ?? '-'}`);
      console.log(`  lastCourseCount: ${d.lastCourseCount ?? '-'}  (unique kj codes seen)`);
      console.log(`  syllabus      : discovered=${sm.urlsDiscovered ?? '-'} probed=${sm.urlsProbed ?? '-'} withText=${sm.urlsWithText ?? '-'} httpErr=${sm.urlsHttpErrors ?? '-'} loginWall=${sm.urlsLoginRedirect ?? '-'} extracted=${sm.examsExtracted ?? '-'}`);
      if (sm.lastError) console.log(`  syllabus.error: ${sm.lastError}`);
      console.log(`  lastError     : ${d.lastError || 'none'}`);

      if (status === 'pending' && lastStartedMs === 0) {
        console.log(`  ⚠ stuck in 'pending' — worker has not picked it up`);
        stuck++;
      } else if (status === 'running' && Date.now() - lastStartedMs > 10 * 60 * 1000) {
        console.log(`  ⚠ stuck in 'running' for > 10 min — worker died mid-sync?`);
        stuck++;
      } else if (status === 'ok' && ageMin <= 60) {
        console.log(`  ✓ healthy (last sync ${ageMin} min ago)`);
        healthy++;
      } else if (status === 'ok' && ageMin > 60) {
        console.log(`  ⚠ ok but stale (${ageMin} min since last sync)`);
        stuck++;
      } else if (status === 'error') {
        console.log(`  ✗ error state`);
        stuck++;
      }
      console.log();
    });

    // 3) Verdict
    console.log('=== Verdict ===');
    if (snap.size === 0) {
      console.log('No e-class connections registered yet — sign in to the PWA and connect your account.');
    } else if (healthy === snap.size) {
      console.log('All connections synced recently. Worker appears to be running normally.');
    } else if (stuck > 0 && healthy === 0) {
      console.log('Worker DOES NOT appear to be running, or is failing on every cycle.');
      console.log('Next: check `systemctl status planary-eclass-worker` and `journalctl -u planary-eclass-worker -n 50`');
    } else {
      console.log(`Mixed: ${healthy} healthy, ${stuck} stuck/stale.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('[FAIL]', error.message);
    console.error('\nMost likely causes:');
    console.error('  - serviceAccount.json missing from', keyPath);
    console.error('  - or FIREBASE_SERVICE_ACCOUNT_KEY env var not set');
    console.error('  - or service account lacks Firestore read permission');
    process.exit(1);
  }
})();
