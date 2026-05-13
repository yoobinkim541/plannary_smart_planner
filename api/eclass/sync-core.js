const { getAdmin } = require('./_admin');
const { decrypt } = require('./_crypto');
const { fetchSeoultechItems } = require('./_seoultech');
const { fetchSyllabusExams } = require('./_syllabus');

const ECLASS_SOURCES = ['eclass', 'eclass-exam'];

function dueTimeFor(type) {
  return type === 'lecture' ? '09:00' : '23:59';
}

function defaultRemindersFor(type) {
  if (type === 'assignment') return [1440, 60];
  if (type === 'quiz') return [60, 10];
  return [60];
}

async function mirrorItemToTodo(db, admin, uid, item) {
  const todoQuery = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', '==', 'eclass')
    .where('sourceItemId', '==', item.externalId)
    .limit(1)
    .get();
  const reminderList = defaultRemindersFor(item.type);
  const payload = {
    uid,
    text: item.title,
    memo: [item.courseTitle, item.ddayText].filter(Boolean).join(' · ') || null,
    dueDate: item.dueDate || null,
    dueTime: item.dueDate ? (item.dueTime || dueTimeFor(item.type)) : null,
    calendarReminderMinutes: reminderList[0],
    calendarReminderMinutesList: reminderList,
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

async function mirrorExamToTodo(db, admin, uid, exam) {
  const externalId = `${exam.courseId}:${exam.type}:${exam.dueDate}`;
  const todoQuery = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', '==', 'eclass-exam')
    .where('sourceItemId', '==', externalId)
    .limit(1)
    .get();
  const reminderList = exam.reminderMinutes || [10080, 4320, 1440];
  const prefix = exam.confidence === 'high' ? '' : '[예상] ';
  const text = `${prefix}${exam.type} - ${exam.courseTitle}`;
  const payload = {
    uid,
    text,
    memo: [exam.courseTitle, exam.note].filter(Boolean).join(' · ') || null,
    dueDate: exam.dueDate,
    dueTime: exam.dueTime || '09:00',
    calendarReminderMinutes: reminderList[0],
    calendarReminderMinutesList: reminderList,
    syncCalendar: false,
    priority: exam.priority || 'high',
    projectId: null,
    imageUrl: null,
    archived: false,
    source: 'eclass-exam',
    sourceItemId: externalId,
    sourceUrl: exam.sourceUrl || null,
    courseTitle: exam.courseTitle || null,
    ddayText: null,
    syncedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (todoQuery.empty) {
    await db.collection('todos').add({
      ...payload,
      completed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      orderIndex: Date.now()
    });
    return externalId;
  }
  const doc = todoQuery.docs[0];
  await doc.ref.set(payload, { merge: true });
  return externalId;
}

async function pruneStaleEclassTodos(db, admin, uid, activeIdsBySource) {
  const snapshot = await db.collection('todos')
    .where('uid', '==', uid)
    .where('source', 'in', ECLASS_SOURCES)
    .get();
  const staleDocs = snapshot.docs.filter(doc => {
    const data = doc.data();
    const active = activeIdsBySource.get(data.source);
    if (!active || !active.size) return false;
    return !active.has(data.sourceItemId);
  });
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

async function syncConnection(uid, connection, options = {}) {
  const admin = getAdmin();
  const db = admin.firestore();
  const ref = db.collection('eclass_connections').doc(uid);
  const sessionCookie = connection.encryptedSessionCookie ? decrypt(connection.encryptedSessionCookie) : '';
  const username = connection.encryptedUsername ? decrypt(connection.encryptedUsername) : '';
  const password = connection.encryptedPassword ? decrypt(connection.encryptedPassword) : '';
  if (!sessionCookie && (!username || !password)) throw new Error('Missing saved E-class credentials');

  const itemsResult = await fetchSeoultechItems({
    baseUrl: connection.baseUrl,
    sessionCookie,
    username,
    password,
    returnPages: true
  });
  const items = Array.isArray(itemsResult) ? itemsResult : itemsResult.items;
  const pages = Array.isArray(itemsResult) ? [] : (itemsResult.pages || []);
  const cookieForSyllabus = Array.isArray(itemsResult) ? sessionCookie : (itemsResult.cookie || sessionCookie);

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

  const activeTodoIds = new Set(items.map(item => item.externalId));
  for (const item of items) {
    await mirrorItemToTodo(db, admin, uid, item);
  }

  let exams = [];
  if (options.includeSyllabi !== false) {
    try {
      exams = await fetchSyllabusExams({
        baseUrl: connection.baseUrl,
        sessionCookie: cookieForSyllabus,
        pages,
        db,
        admin,
        uid
      });
    } catch (error) {
      console.error('[syllabus]', uid, error.message);
    }
  }
  const activeExamIds = new Set();
  for (const exam of exams) {
    const id = await mirrorExamToTodo(db, admin, uid, exam);
    activeExamIds.add(id);
  }

  const activeIdsBySource = new Map([
    ['eclass', activeTodoIds],
    ['eclass-exam', activeExamIds]
  ]);
  await pruneStaleEclassTodos(db, admin, uid, activeIdsBySource);
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
