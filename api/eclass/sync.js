const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { syncAll } = require('./sync-core');

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
      syncStatus: 'pending'
    }, { merge: true });
    return sendJson(res, 202, { ok: true, status: 'pending' });
  } catch (error) {
    console.error('[eclass/sync]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Sync failed' });
  }
};
