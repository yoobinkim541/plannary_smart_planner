const crypto = require('crypto');
const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('../eclass/_admin');

function sessionDocId(uid, sessionId) {
  return crypto.createHash('sha256').update(`${uid}:${sessionId}`).digest('hex');
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value._seconds === 'number') return value._seconds * 1000;
  return 0;
}

function serializeSession(doc, currentSessionId = '') {
  const data = doc.data() || {};
  return {
    id: data.sessionId || doc.id,
    userAgent: data.userAgent || '',
    ip: data.ip || '',
    createdAt: data.createdAt || null,
    lastSeenAt: data.lastSeenAt || null,
    revokedAt: data.revokedAt || null,
    current: !!currentSessionId && data.sessionId === currentSessionId
  };
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const sessions = db.collection('account_sessions');

    if (req.method === 'GET') {
      const currentSessionId = String(req.query?.currentSessionId || '').trim();
      const snapshot = await sessions.where('uid', '==', user.uid).limit(100).get();
      const docs = snapshot.docs
        .sort((a, b) => toMillis(b.data().lastSeenAt) - toMillis(a.data().lastSeenAt))
        .slice(0, 50);
      return sendJson(res, 200, { sessions: docs.map(doc => serializeSession(doc, currentSessionId)) });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (req.method === 'POST') {
      const sessionId = String(body.sessionId || '').trim();
      if (!sessionId || sessionId.length > 128) return sendJson(res, 400, { error: 'Valid sessionId is required' });
      const ref = sessions.doc(sessionDocId(user.uid, sessionId));
      const snap = await ref.get();
      await ref.set({
        uid: user.uid,
        sessionId,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
        ip: clientIp(req),
        createdAt: snap.exists ? (snap.data().createdAt || now) : now,
        lastSeenAt: now,
        revokedAt: admin.firestore.FieldValue.delete()
      }, { merge: true });
      return sendJson(res, 200, { ok: true, sessionId });
    }

    const sessionId = String(body.sessionId || '').trim();
    const revokeAll = !!body.revokeAll;
    const revokeOtherSessions = !!body.revokeOtherSessions;
    const currentSessionId = String(body.currentSessionId || '').trim();

    if (revokeAll || revokeOtherSessions) {
      const snapshot = await sessions.where('uid', '==', user.uid).limit(300).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        if (revokeOtherSessions && currentSessionId && data.sessionId === currentSessionId) return;
        batch.set(doc.ref, { revokedAt: now, updatedAt: now }, { merge: true });
      });
      await batch.commit();
      if (revokeAll) await admin.auth().revokeRefreshTokens(user.uid);
      return sendJson(res, 200, {
        ok: true,
        firebaseTokensRevoked: revokeAll,
        note: revokeAll
          ? 'All Firebase refresh tokens were revoked.'
          : 'Other sessions were marked revoked in backend metadata.'
      });
    }

    if (!sessionId) return sendJson(res, 400, { error: 'sessionId is required' });
    await sessions.doc(sessionDocId(user.uid, sessionId)).set({
      uid: user.uid,
      sessionId,
      revokedAt: now,
      updatedAt: now
    }, { merge: true });
    return sendJson(res, 200, {
      ok: true,
      firebaseTokensRevoked: false,
      note: 'Single-session revoke marks backend metadata only; Firebase does not support revoking one ID token session.'
    });
  } catch (error) {
    console.error('[account/sessions]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Session request failed' });
  }
};
