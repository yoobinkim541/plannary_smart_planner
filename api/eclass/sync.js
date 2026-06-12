const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { syncAll, syncConnection } = require('./sync-core');
const { sendPushToUser } = require('../notifications/_send-fcm');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization || '';
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      const result = await syncAll();
      return sendJson(res, 200, { ok: true, ...result });
    }

    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const ref = db.collection('eclass_connections').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) return sendJson(res, 404, { error: 'E-class connection not found' });
    await ref.set({
      syncRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'running',
      lastSyncStartedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    try {
      const result = await syncConnection(user.uid, snap.data());
      await ref.set({
        syncStatus: 'ok',
        lastError: null,
        lastTodoCount: result.todoCount,
        lastExamCount: result.examCount,
        lastProjectCount: result.projectCount,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Notify user about newly added tasks (fire-and-forget)
      if (result.newTodoCount > 0) {
        sendPushToUser(user.uid, {
          title: 'e-Class sync complete',
          body: `${result.newTodoCount} new item${result.newTodoCount === 1 ? '' : 's'} added`,
          tag: 'eclass-sync',
          url: '/',
          data: { type: 'eclass-sync', newCount: String(result.newTodoCount) },
        }).catch(err => console.warn('[eclass/sync] push failed:', err.message));
      }

      return sendJson(res, 200, { ok: true, status: 'ok', ...result });
    } catch (syncError) {
      await ref.set({
        syncStatus: 'pending',
        lastError: syncError.message || String(syncError)
      }, { merge: true });
      return sendJson(res, 202, { ok: true, status: 'pending', queued: true });
    }
  } catch (error) {
    console.error('[eclass/sync]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Sync failed' });
  }
};
