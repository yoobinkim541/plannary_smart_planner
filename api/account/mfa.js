const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('../eclass/_admin');
const { encrypt, decrypt } = require('../eclass/_crypto');
const { generateSecret, verifyTotp, otpauthUrl } = require('./_totp');

function publicState(data = {}) {
  return {
    enabled: !!data.enabled,
    setupPending: !!data.pendingSecret,
    enabledAt: data.enabledAt || null,
    updatedAt: data.updatedAt || null
  };
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const ref = db.collection('account_security').doc(user.uid);

    if (req.method === 'GET') {
      const snap = await ref.get();
      return sendJson(res, 200, publicState(snap.data() || {}));
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '').trim();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const snap = await ref.get();
    const data = snap.data() || {};

    if (action === 'setup') {
      const secret = generateSecret();
      await ref.set({
        uid: user.uid,
        pendingSecret: encrypt(secret),
        updatedAt: now
      }, { merge: true });
      return sendJson(res, 200, {
        ...publicState({ ...data, pendingSecret: true }),
        secret,
        otpauthUrl: otpauthUrl({
          issuer: 'Planary',
          accountName: user.email || user.uid,
          secret
        })
      });
    }

    if (action === 'verify') {
      const pendingSecret = data.pendingSecret ? decrypt(data.pendingSecret) : '';
      if (!pendingSecret) return sendJson(res, 400, { error: 'No pending 2FA setup' });
      if (!verifyTotp(pendingSecret, body.code)) return sendJson(res, 400, { error: 'Invalid 2FA code' });
      await ref.set({
        uid: user.uid,
        enabled: true,
        secret: encrypt(pendingSecret),
        pendingSecret: admin.firestore.FieldValue.delete(),
        enabledAt: now,
        updatedAt: now
      }, { merge: true });
      return sendJson(res, 200, { enabled: true, setupPending: false });
    }

    if (action === 'disable') {
      const secret = data.secret ? decrypt(data.secret) : '';
      if (data.enabled && secret && !verifyTotp(secret, body.code)) {
        return sendJson(res, 400, { error: 'Invalid 2FA code' });
      }
      await ref.set({
        uid: user.uid,
        enabled: false,
        secret: admin.firestore.FieldValue.delete(),
        pendingSecret: admin.firestore.FieldValue.delete(),
        disabledAt: now,
        updatedAt: now
      }, { merge: true });
      return sendJson(res, 200, { enabled: false, setupPending: false });
    }

    return sendJson(res, 400, { error: 'Unsupported 2FA action' });
  } catch (error) {
    console.error('[account/mfa]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || '2FA request failed' });
  }
};
