const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { syncAll, syncConnection } = require('./sync-core');

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
    const snap = await db.collection('eclass_connections').doc(user.uid).get();
    if (!snap.exists) return sendJson(res, 404, { error: 'E-class connection not found' });
    const result = await syncConnection(user.uid, snap.data());
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error('[eclass/sync]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Sync failed' });
  }
};
