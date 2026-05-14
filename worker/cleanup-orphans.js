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
    console.error('[cleanup] failed to load .env:', error.message);
  }
})();

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const ORPHAN_UIDS = [
  '0noUEJcOeLYd7ucH7sDCyutbDqz2',
  'QmAONsG8Q5fktGsTMShGi4Dk7ei1'
];
const KEEP_UID = 'Q3aWy2KW9zOyXaliFtAA8BKcGfy1';

const APPLY = process.argv.includes('--apply');

function initFirebase() {
  if (admin.apps.length) return;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccount.json');
  if (fs.existsSync(keyPath)) {
    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return;
  }
  throw new Error('Service account not found at ' + keyPath);
}

async function deleteDocsInBatches(docs, label) {
  if (!docs.length) return;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = admin.firestore().batch();
    docs.slice(i, i + 400).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log('[cleanup] ' + label + ': deleted ' + Math.min(i + 400, docs.length) + '/' + docs.length);
  }
}

async function run() {
  initFirebase();
  const db = admin.firestore();

  if (ORPHAN_UIDS.includes(KEEP_UID)) {
    throw new Error('Safety check failed: KEEP_UID is in ORPHAN_UIDS');
  }

  console.log('[cleanup] mode=' + (APPLY ? 'APPLY (real delete)' : 'DRY-RUN (no changes)'));
  console.log('[cleanup] orphan uids: ' + ORPHAN_UIDS.join(', '));
  console.log('[cleanup] keep uid:    ' + KEEP_UID);

  for (const uid of ORPHAN_UIDS) {
    console.log('\n--- uid ' + uid + ' ---');

    const conn = await db.collection('eclass_connections').doc(uid).get();
    console.log('  eclass_connections doc exists: ' + conn.exists);

    const todos = await db.collection('todos').where('uid', '==', uid).get();
    console.log('  todos: ' + todos.size + ' docs');

    const items = await db.collection('eclass_items').where('uid', '==', uid).get();
    console.log('  eclass_items: ' + items.size + ' docs');

    if (!APPLY) continue;

    if (conn.exists) {
      await conn.ref.delete();
      console.log('  deleted eclass_connections doc');
    }
    await deleteDocsInBatches(todos.docs, 'todos[' + uid + ']');
    await deleteDocsInBatches(items.docs, 'eclass_items[' + uid + ']');
  }

  console.log('\n[cleanup] done. ' + (APPLY ? '' : 'Re-run with --apply to actually delete.'));
  process.exit(0);
}

run().catch(error => {
  console.error('[cleanup] failed:', error.stack || error.message || error);
  process.exit(1);
});
