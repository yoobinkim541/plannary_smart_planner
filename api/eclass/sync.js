const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('./_admin');
const { decrypt } = require('./_crypto');
const { fetchSeoultechItems } = require('./_seoultech');

function dueTimeFor(type) {
  return type === 'lecture' ? '09:00' : '23:59';
}

async function mirrorItemToTodo(db, admin, uid, item) {
  const todoQuery = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', '==', 'eclass')
    .where('sourceItemId', '==', item.externalId)
    .limit(1)
    .get();
  const payload = {
    uid,
    text: item.title,
    memo: [item.courseTitle, item.ddayText].filter(Boolean).join(' · ') || null,
    dueDate: item.dueDate || null,
    dueTime: item.dueDate ? (item.dueTime || dueTimeFor(item.type)) : null,
    calendarReminderMinutes: item.type === 'assignment' ? 1440 : 60,
    syncCalendar: false,
    priority: item.type === 'assignment' ? 'high' : 'medium',
    projectId: null,
    imageUrl: null,
    archived: false,
    source: 'eclass',
    sourceItemId: item.externalId,
    sourceUrl: item.url,
    courseTitle: item.courseTitle || null,
    ddayText: item.ddayText || null,
    syncedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (todoQuery.empty) {
    await db.collection('todos').add({
      ...payload,
      completed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      orderIndex: Date.now()
    });
    return;
  }
  const doc = todoQuery.docs[0];
  await doc.ref.set(payload, { merge: true });
}

async function pruneStaleEclassTodos(db, admin, uid, activeSourceItemIds) {
  if (!activeSourceItemIds.size) return;
  const snapshot = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', '==', 'eclass')
    .get();
  const staleDocs = snapshot.docs.filter(doc => !activeSourceItemIds.has(doc.data().sourceItemId));
  for (let index = 0; index < staleDocs.length; index += 400) {
    const batch = db.batch();
    staleDocs.slice(index, index + 400).forEach(doc => {
      batch.set(doc.ref, {
        archived: true,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function syncConnection(uid, connection) {
  const admin = getAdmin();
  const db = admin.firestore();
  const ref = db.collection('eclass_connections').doc(uid);
  const sessionCookie = connection.encryptedSessionCookie ? decrypt(connection.encryptedSessionCookie) : '';
  const username = connection.encryptedUsername ? decrypt(connection.encryptedUsername) : '';
  const password = connection.encryptedPassword ? decrypt(connection.encryptedPassword) : '';
  if (!sessionCookie && (!username || !password)) throw new Error('Missing saved E-class credentials');
  const items = await fetchSeoultechItems({ baseUrl: connection.baseUrl, sessionCookie, username, password });
  const batch = db.batch();
  items.forEach(item => {
    const itemRef = db.collection('eclass_items').doc(`${uid}_${Buffer.from(item.externalId).toString('base64url').slice(0, 80)}`);
    batch.set(itemRef, {
      uid,
      ...item,
      source: 'seoultech-eclass',
      completed: false,
      syncedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  batch.set(ref, {
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastError: null,
    lastItemCount: items.length
  }, { merge: true });
  await batch.commit();
  const activeSourceItemIds = new Set(items.map(item => item.externalId));
  for (const item of items) {
    await mirrorItemToTodo(db, admin, uid, item);
  }
  await pruneStaleEclassTodos(db, admin, uid, activeSourceItemIds);
  return items.length;
}

async function syncAll() {
  const admin = getAdmin();
  const db = admin.firestore();
  const snapshot = await db.collection('eclass_connections').where('enabled', '==', true).get();
  let count = 0;
  for (const doc of snapshot.docs) {
    try {
      count += await syncConnection(doc.id, doc.data());
    } catch (error) {
      await doc.ref.set({
        lastError: error.message || String(error),
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
  return count;
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization || '';
    if (authHeader === `Bearer ${cronSecret}`) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return sendJson(res, 401, { error: 'Unauthorized cron' });
      const count = await syncAll();
      return sendJson(res, 200, { ok: true, count });
    }

    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collection('eclass_connections').doc(user.uid).get();
    if (!snap.exists) return sendJson(res, 404, { error: 'E-class connection not found' });
    const count = await syncConnection(user.uid, snap.data());
    return sendJson(res, 200, { ok: true, count });
  } catch (error) {
    console.error('[eclass/sync]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Sync failed' });
  }
};
