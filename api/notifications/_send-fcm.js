const { getAdmin } = require('../eclass/_admin');

/**
 * Send a push notification to all FCM tokens registered for a user.
 * Automatically removes stale/expired tokens from Firestore.
 */
async function sendPushToUser(uid, { title, body, url, tag, data = {} }) {
  const admin = getAdmin();
  const db = admin.firestore();

  // Tokens are stored as individual documents in fcm_tokens/{token} keyed by uid.
  const tokenSnap = await db.collection('fcm_tokens').where('uid', '==', uid).get();
  const tokens = tokenSnap.docs.map(d => d.data().token).filter(Boolean);
  if (!tokens.length) return { sent: 0, skipped: 'no_tokens' };

  const messaging = admin.messaging();
  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: {
        title, body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: tag || 'planary',
        requireInteraction: false,
      },
      fcmOptions: { link: url || '/redesign/' },
    },
    data: { url: url || '/redesign/', ...data },
  });

  // Clean up invalid / unregistered tokens
  const staleTokenIds = [];
  result.responses.forEach((resp, i) => {
    if (!resp.success) {
      const code = resp.error?.code || '';
      if (/registration-token-not-registered|invalid-registration-token|unregistered/i.test(code)) {
        staleTokenIds.push(tokens[i]);
      }
    }
  });
  if (staleTokenIds.length) {
    const batch = db.batch();
    staleTokenIds.forEach(token => batch.delete(db.collection('fcm_tokens').doc(token)));
    await batch.commit();
  }

  return { sent: result.successCount, failed: result.failureCount };
}

module.exports = { sendPushToUser };
