const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { encrypt } = require('./_crypto');
const { DEFAULT_BASE_URL, loginSeoultech, normalizeBaseUrl } = require('./_seoultech');

function hasSavedCredentials(data = {}) {
  return !!data.encryptedSessionCookie || (!!data.encryptedUsername && !!data.encryptedPassword);
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;
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
        connected: data.enabled === false ? false : hasSavedCredentials(data),
        baseUrl: data.baseUrl || DEFAULT_BASE_URL,
        platform: data.platform || 'seoultech-moodle',
        lastSyncedAt: data.lastSyncedAt || null,
        lastError: data.lastError || null
      });
    }

    if (req.method === 'DELETE') {
      await ref.set({
        uid: user.uid,
        enabled: false,
        encryptedUsername: admin.firestore.FieldValue.delete(),
        encryptedPassword: admin.firestore.FieldValue.delete(),
        encryptedSessionCookie: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return sendJson(res, 200, { connected: false });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || !password) return sendJson(res, 400, { error: 'E-class ID and password are required' });
    const baseUrl = normalizeBaseUrl(body.baseUrl || DEFAULT_BASE_URL);
    await loginSeoultech({ baseUrl, username, password });

    await ref.set({
      uid: user.uid,
      enabled: true,
      baseUrl,
      platform: 'seoultech-moodle',
      encryptedUsername: encrypt(username),
      encryptedPassword: encrypt(password),
      encryptedSessionCookie: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return sendJson(res, 200, { connected: true, baseUrl, platform: 'seoultech-moodle' });
  } catch (error) {
    console.error('[eclass/connection]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Connection failed' });
  }
};
