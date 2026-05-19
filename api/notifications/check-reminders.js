const { getAdmin } = require('../eclass/_admin');
const { sendPushToUser } = require('./_send-fcm');

// Maximum age of an unsent reminder to still fire it.
// 90 s covers a 1-minute cron with up to 30 s of clock jitter.
// Increase to e.g. 65 * 60 * 1000 if using an hourly cron.
const LATE_WINDOW_MS = 90 * 1000;

function buildTimeLabel(mins) {
  if (mins >= 10080) return `${Math.round(mins / 10080)}주 전`;
  if (mins >= 1440)  return `${Math.round(mins / 1440)}일 전`;
  if (mins >= 60)    return `${Math.round(mins / 60)}시간 전`;
  return `${mins}분 전`;
}

module.exports = async function handler(req, res) {
  // Vercel cron injects Authorization: Bearer {CRON_SECRET}
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getAdmin();
  const db = admin.firestore();
  const nowMs = Date.now();

  // Scan todos whose dueDate falls in the window covered by the largest reminder
  // (20160 min = 14 days) so we never query the entire collection.
  const scanStart = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const scanEnd   = new Date(nowMs + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const snapshot = await db.collection('todos')
    .where('dueDate', '>=', scanStart)
    .where('dueDate', '<=', scanEnd)
    .get();

  let notified = 0;
  const errors = [];

  for (const doc of snapshot.docs) {
    const todo = doc.data();
    if (todo.completed || todo.archived) continue;
    if (!todo.uid || !todo.dueDate) continue;

    const reminderList = todo.calendarReminderMinutesList;
    if (!Array.isArray(reminderList) || !reminderList.length) continue;

    const [h, m] = (todo.dueTime || '23:59').split(':').map(Number);
    const dueMs = new Date(
      `${todo.dueDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    ).getTime();
    if (isNaN(dueMs)) continue;

    const sentFor = todo.notifSentFor || [];

    for (const mins of reminderList) {
      const key = String(mins);
      if (sentFor.includes(key)) continue;

      const fireMs = dueMs - mins * 60 * 1000;
      if (fireMs > nowMs) continue;             // not yet due
      if (nowMs - fireMs > LATE_WINDOW_MS) continue; // too old to fire

      const timeLabel = buildTimeLabel(mins);
      const dateStr = todo.dueTime ? `${todo.dueDate} ${todo.dueTime}` : todo.dueDate;

      try {
        await sendPushToUser(todo.uid, {
          title: `⏰ ${todo.text}`,
          body: `${timeLabel} · ${dateStr}`,
          tag: `reminder-${doc.id}-${mins}`,
          url: '/redesign/',
          data: { todoId: doc.id, type: 'reminder', reminderMinutes: key },
        });
        await doc.ref.update({
          notifSentFor: admin.firestore.FieldValue.arrayUnion(key),
        });
        notified++;
      } catch (err) {
        errors.push({ todoId: doc.id, mins, error: err.message });
        console.error('[check-reminders]', doc.id, mins, err.message);
      }
    }
  }

  res.json({ checked: snapshot.size, notified, errors: errors.length ? errors : undefined });
};
