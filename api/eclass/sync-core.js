const { getAdmin } = require('./_admin');
const { decrypt } = require('./_crypto');
const { fetchSeoultechItems } = require('./_seoultech');
const { fetchSyllabusExams } = require('./_syllabus');

const ECLASS_SOURCES = ['eclass', 'eclass-exam'];
const BATCH_LIMIT = 400;

function dueTimeFor(type) {
  return type === 'lecture' ? '09:00' : '23:59';
}

function defaultRemindersFor(type) {
  if (type === 'assignment') return [1440, 60];
  if (type === 'quiz') return [60, 10];
  return [60];
}

function buildTodoPayload({ source, sourceItemId, text, dueDate, dueTime, reminders, priority, memo, sourceUrl, courseTitle, ddayText, uid, ts }) {
  return {
    uid, text,
    memo: memo || null,
    dueDate: dueDate || null,
    dueTime: dueDate ? (dueTime || null) : null,
    calendarReminderMinutes: reminders[0],
    calendarReminderMinutesList: reminders,
    syncCalendar: false,
    priority,
    projectId: null,
    imageUrl: null,
    archived: false,
    source, sourceItemId,
    sourceUrl: sourceUrl || null,
    courseTitle: courseTitle || null,
    ddayText: ddayText || null,
    syncedAt: ts
  };
}

function itemPayload(item, uid, ts) {
  const reminders = defaultRemindersFor(item.type);
  return buildTodoPayload({
    uid, ts,
    source: 'eclass',
    sourceItemId: item.externalId,
    text: item.title,
    memo: [item.courseTitle, item.ddayText].filter(Boolean).join(' · '),
    dueDate: item.dueDate,
    dueTime: item.dueTime || dueTimeFor(item.type),
    reminders,
    priority: item.type === 'assignment' ? 'high' : 'medium',
    sourceUrl: item.url,
    courseTitle: item.courseTitle,
    ddayText: item.ddayText
  });
}

function examPayload(exam, uid, ts) {
  const reminders = exam.reminderMinutes || [10080, 4320, 1440];
  const prefix = exam.confidence === 'high' ? '' : '[예상] ';
  return buildTodoPayload({
    uid, ts,
    source: 'eclass-exam',
    sourceItemId: `${exam.courseId}:${exam.type}:${exam.dueDate}`,
    text: `${prefix}${exam.type} - ${exam.courseTitle}`,
    memo: [exam.courseTitle, exam.note].filter(Boolean).join(' · '),
    dueDate: exam.dueDate,
    dueTime: exam.dueTime || '09:00',
    reminders,
    priority: exam.priority || 'high',
    sourceUrl: exam.sourceUrl,
    courseTitle: exam.courseTitle
  });
}

async function commitInChunks(db, ops) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    ops.slice(i, i + BATCH_LIMIT).forEach(op => op(batch));
    await batch.commit();
  }
}

async function loadExistingEclassTodos(db, uid) {
  const snapshot = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', 'in', ECLASS_SOURCES)
    .get();
  const byKey = new Map();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    byKey.set(`${data.source}:${data.sourceItemId}`, doc.ref);
  });
  return { byKey, allDocs: snapshot.docs };
}

async function syncConnection(uid, connection, options = {}) {
  const admin = getAdmin();
  const db = admin.firestore();
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const connectionRef = db.collection('eclass_connections').doc(uid);

  const sessionCookie = connection.encryptedSessionCookie ? decrypt(connection.encryptedSessionCookie) : '';
  const username = connection.encryptedUsername ? decrypt(connection.encryptedUsername) : '';
  const password = connection.encryptedPassword ? decrypt(connection.encryptedPassword) : '';
  if (!sessionCookie && (!username || !password)) throw new Error('Missing saved E-class credentials');

  const { items, pages, cookie } = await fetchSeoultechItems({
    baseUrl: connection.baseUrl,
    sessionCookie, username, password,
    returnPages: true
  });

  let exams = [];
  if (options.includeSyllabi !== false) {
    try {
      exams = await fetchSyllabusExams({
        baseUrl: connection.baseUrl,
        sessionCookie: cookie || sessionCookie,
        pages, db, admin, uid
      });
    } catch (error) {
      console.error('[syllabus]', uid, error.message);
    }
  }

  const { byKey, allDocs } = await loadExistingEclassTodos(db, uid);
  const payloads = [
    ...items.map(item => itemPayload(item, uid, ts)),
    ...exams.map(exam => examPayload(exam, uid, ts))
  ];
  const activeKeys = new Set(payloads.map(p => `${p.source}:${p.sourceItemId}`));

  const ops = [];

  payloads.forEach(payload => {
    const key = `${payload.source}:${payload.sourceItemId}`;
    const existingRef = byKey.get(key);
    if (existingRef) {
      ops.push(batch => batch.set(existingRef, payload, { merge: true }));
    } else {
      const newRef = db.collection('todos').doc();
      ops.push(batch => batch.set(newRef, {
        ...payload,
        completed: false,
        createdAt: ts,
        orderIndex: Date.now()
      }));
    }
  });

  // Mirror raw items into eclass_items (legacy, kept for read-only client access)
  items.forEach(item => {
    const itemRef = db.collection('eclass_items')
      .doc(`${uid}_${Buffer.from(item.externalId).toString('base64url').slice(0, 80)}`);
    ops.push(batch => batch.set(itemRef, {
      uid, ...item,
      source: 'seoultech-eclass',
      completed: false,
      syncedAt: ts
    }, { merge: true }));
  });

  // Archive stale e-class todos (not in this sync's active set)
  allDocs.forEach(doc => {
    const data = doc.data();
    const key = `${data.source}:${data.sourceItemId}`;
    if (!activeKeys.has(key) && !data.archived) {
      ops.push(batch => batch.set(doc.ref, { archived: true, syncedAt: ts }, { merge: true }));
    }
  });

  ops.push(batch => batch.set(connectionRef, {
    lastSyncedAt: ts,
    lastError: null,
    lastItemCount: items.length,
    lastExamCount: exams.length
  }, { merge: true }));

  await commitInChunks(db, ops);
  return { todoCount: items.length, examCount: exams.length };
}

async function syncAll(options = {}) {
  const admin = getAdmin();
  const db = admin.firestore();
  const snapshot = await db.collection('eclass_connections').where('enabled', '==', true).get();
  let todoCount = 0;
  let examCount = 0;
  for (const doc of snapshot.docs) {
    try {
      const result = await syncConnection(doc.id, doc.data(), options);
      todoCount += result.todoCount;
      examCount += result.examCount;
    } catch (error) {
      await doc.ref.set({
        lastError: error.message || String(error),
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
  return { todoCount, examCount };
}

module.exports = { syncAll, syncConnection };
