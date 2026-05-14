const { getAdmin } = require('../api/eclass/_admin');

const WINDOW_MS = 5 * 60 * 1000;

function buildBody(min, dueTime) {
  const abs = Math.abs(min);
  const label = abs >= 1440
    ? `${Math.round(abs / 1440)}일`
    : abs >= 60
      ? `${Math.round(abs / 60)}시간`
      : `${abs}분`;
  return `${label} 뒤 · ${dueTime}`;
}

async function deleteInvalidTokens(db, responses, tokenDocs) {
  const dead = [];
  responses.forEach((resp, idx) => {
    if (resp.success) return;
    const code = resp.error && resp.error.code;
    if (code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token') {
      dead.push(tokenDocs[idx].ref);
    }
  });
  for (const ref of dead) {
    await ref.delete().catch(() => {});
  }
}

async function reminderTick() {
  const admin = getAdmin();
  const db = admin.firestore();
  const messaging = admin.messaging();
  const now = Date.now();
  let firedCount = 0;

  const snap = await db.collection('todos')
    .where('completed', '==', false)
    .where('archived', '==', false)
    .get();

  const tokenCache = new Map();
  async function getTokensForUid(uid) {
    if (tokenCache.has(uid)) return tokenCache.get(uid);
    const tokenSnap = await db.collection('fcm_tokens').where('uid', '==', uid).get();
    const docs = tokenSnap.docs.filter(d => d.data().token);
    tokenCache.set(uid, docs);
    return docs;
  }

  for (const doc of snap.docs) {
    const todo = doc.data();
    if (!todo.uid || !todo.dueDate || !todo.dueTime) continue;
    const reminders = Array.isArray(todo.calendarReminderMinutesList) && todo.calendarReminderMinutesList.length
      ? todo.calendarReminderMinutesList
      : (Number.isFinite(todo.calendarReminderMinutes) ? [todo.calendarReminderMinutes] : []);
    if (!reminders.length) continue;

    const due = new Date(`${todo.dueDate}T${todo.dueTime}:00+09:00`).getTime();
    if (!Number.isFinite(due)) continue;

    const sent = (todo.remindersSent && typeof todo.remindersSent === 'object') ? { ...todo.remindersSent } : {};
    const toFire = [];
    for (const minRaw of reminders) {
      const min = Number(minRaw);
      if (!Number.isFinite(min)) continue;
      if (sent[String(min)]) continue;
      const fireAt = due - min * 60 * 1000;
      if (fireAt <= now && fireAt > now - WINDOW_MS) toFire.push(min);
    }
    if (!toFire.length) continue;

    const tokenDocs = await getTokensForUid(todo.uid);
    if (!tokenDocs.length) {
      toFire.forEach(min => { sent[String(min)] = admin.firestore.Timestamp.now(); });
      await doc.ref.set({ remindersSent: sent }, { merge: true });
      continue;
    }
    const tokens = tokenDocs.map(d => d.data().token);

    for (const min of toFire) {
      try {
        const resp = await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: todo.text || '리마인더',
            body: buildBody(min, todo.dueTime)
          },
          data: {
            todoId: doc.id,
            dueDate: todo.dueDate,
            dueTime: todo.dueTime,
            url: todo.sourceUrl || '/'
          }
        });
        firedCount += resp.successCount;
        if (resp.failureCount) {
          await deleteInvalidTokens(db, resp.responses, tokenDocs);
        }
      } catch (error) {
        console.error('[reminder] send failed', doc.id, min, error.message);
      }
      sent[String(min)] = admin.firestore.Timestamp.now();
    }
    await doc.ref.set({ remindersSent: sent }, { merge: true });
  }

  return { firedCount };
}

module.exports = { reminderTick };
