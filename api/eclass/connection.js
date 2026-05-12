const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { encrypt } = require('./_crypto');
const { DEFAULT_BASE_URL, normalizeBaseUrl } = require('./_seoultech');

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;
  try {
    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const ref = db.collection('eclass_connections').doc(user.uid);

    if (req.method === 'GET') {
      const snap = await ref.get();
      if (!snap.exists) return sendJson(res, 200, { connected: false, baseUrl: DEFAULT_BASE_URL });
      const data = snap.data() || {};
      return sendJson(res, 200, {
        connected: !!data.enabled,
        baseUrl: data.baseUrl || DEFAULT_BASE_URL,
        platform: data.platform || 'seoultech-moodle',
        lastSyncedAt: data.lastSyncedAt || null,
        lastError: data.lastError || null
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const sessionCookie = String(body.sessionCookie || '').trim();
    if (!sessionCookie) return sendJson(res, 400, { error: 'Session cookie is required' });
    const baseUrl = normalizeBaseUrl(body.baseUrl || DEFAULT_BASE_URL);

    await ref.set({
      uid: user.uid,
      enabled: true,
      baseUrl,
      platform: 'seoultech-moodle',
      encryptedSessionCookie: encrypt(sessionCookie),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return sendJson(res, 200, { connected: true, baseUrl, platform: 'seoultech-moodle' });
  } catch (error) {
    console.error('[eclass/connection]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Connection failed' });
  }
};
