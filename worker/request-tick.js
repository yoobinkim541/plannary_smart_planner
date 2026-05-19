const { getAdmin } = require('../api/eclass/_admin');
const { syncConnection } = require('../api/eclass/sync-core');

const STALE_MS = 10 * 60 * 1000;

async function requestTick() {
  const admin = getAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const now = Date.now();
  let processed = 0;

  const staleSnap = await db.collection('eclass_connections')
    .where('syncStatus', '==', 'running')
    .get();
  for (const doc of staleSnap.docs) {
    const started = doc.data().lastSyncStartedAt;
    const startedMs = started && typeof started.toMillis === 'function' ? started.toMillis() : 0;
    if (startedMs && now - startedMs > STALE_MS) {
      await doc.ref.set({ syncStatus: 'pending' }, { merge: true });
    }
  }

  const pendingSnap = await db.collection('eclass_connections')
    .where('syncStatus', '==', 'pending')
    .get();

  for (const doc of pendingSnap.docs) {
    const claimed = await db.runTransaction(async tx => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists || fresh.data().syncStatus !== 'pending') return false;
      tx.set(doc.ref, {
        syncStatus: 'running',
        lastSyncStartedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    });
    if (!claimed) continue;

    try {
      const data = (await doc.ref.get()).data();
      const result = await syncConnection(doc.id, data);
      await doc.ref.set({
        syncStatus: 'ok',
        lastSyncedAt: FieldValue.serverTimestamp(),
        lastError: null,
        lastTodoCount: result.todoCount,
        lastExamCount: result.examCount,
        lastProjectCount: result.projectCount
      }, { merge: true });
      processed++;
    } catch (error) {
      const message = error && (error.message || String(error));
      console.error('[request-tick]', doc.id, message);
      await doc.ref.set({
        syncStatus: 'error',
        lastError: message || 'sync failed',
        lastSyncedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  return { processed };
}

module.exports = { requestTick };
