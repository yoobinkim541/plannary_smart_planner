const { getAdmin } = require('./_admin');
const { decrypt } = require('./_crypto');
const { fetchSeoultechItems } = require('./_seoultech');
const { fetchSyllabusExams, discoverCourseKjs } = require('./_syllabus');

const ECLASS_SOURCES = ['eclass', 'eclass-exam'];
const COURSE_PROJECT_COLORS = ['#7f0df2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];
const BATCH_LIMIT = 400;

function dueTimeFor(type) {
  return type === 'lecture' ? '09:00' : '23:59';
}

function defaultRemindersFor(type) {
  if (type === 'assignment') return [1440, 60];
  if (type === 'quiz') return [60, 10];
  return [60];
}

function buildTodoPayload({ source, sourceItemId, text, dueDate, dueTime, reminders, priority, memo, sourceUrl, courseTitle, ddayText, uid, ts, projectId }) {
  return {
    uid, text,
    memo: memo || null,
    dueDate: dueDate || null,
    dueTime: dueDate ? (dueTime || null) : null,
    calendarReminderMinutes: reminders[0],
    calendarReminderMinutesList: reminders,
    syncCalendar: false,
    priority,
    projectId: projectId || null,
    imageUrl: null,
    archived: false,
    source, sourceItemId,
    sourceUrl: sourceUrl || null,
    courseTitle: courseTitle || null,
    ddayText: ddayText || null,
    syncedAt: ts
  };
}

function itemPayload(item, uid, ts, projectId) {
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
    ddayText: item.ddayText,
    projectId
  });
}

function examPayload(exam, uid, ts, projectId) {
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
    courseTitle: exam.courseTitle,
    projectId
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

function normalizeCourseTitle(courseTitle) {
  return String(courseTitle || 'SeoulTech e-Class').trim() || 'SeoulTech e-Class';
}

async function loadCourseProjects(db, uid) {
  const snapshot = await db.collection('projects')
    .where('uid', '==', uid)
    .get();
  const byCourse = new Map();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.source === 'eclass-course' && data.courseTitle) {
      byCourse.set(normalizeCourseTitle(data.courseTitle), doc.ref);
    }
  });
  return byCourse;
}

async function ensureCourseProjects(db, uid, courseTitles, ts) {
  const byCourse = await loadCourseProjects(db, uid);
  const missingTitles = courseTitles.filter(courseTitle => !byCourse.has(courseTitle));
  const ops = [];

  const existingCount = byCourse.size;
  missingTitles.forEach((courseTitle, index) => {
    const ref = db.collection('projects').doc();
    byCourse.set(courseTitle, ref);
    ops.push(batch => batch.set(ref, {
      uid,
      name: courseTitle,
      color: COURSE_PROJECT_COLORS[(existingCount + index) % COURSE_PROJECT_COLORS.length],
      icon: 'eclass',
      source: 'eclass-course',
      courseTitle,
      createdAt: ts
    }));
  });

  await commitInChunks(db, ops);
  return { byCourse, createdCount: ops.length };
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
  let syllabusMetrics = null;
  if (options.includeSyllabi !== false) {
    try {
      const result = await fetchSyllabusExams({
        baseUrl: connection.baseUrl,
        sessionCookie: cookie || sessionCookie,
        pages, db, admin, uid
      });
      exams = result.exams || [];
      syllabusMetrics = result.metrics || null;
    } catch (error) {
      console.error('[syllabus]', uid, error.message);
      syllabusMetrics = { lastError: error.message || String(error) };
    }
  }

  const { byKey, allDocs } = await loadExistingEclassTodos(db, uid);
  const existingCourseTitles = allDocs
    .map(doc => normalizeCourseTitle(doc.data().courseTitle))
    .filter(Boolean);
  const courseTitles = [...new Set([
    ...items.map(item => normalizeCourseTitle(item.courseTitle)),
    ...exams.map(exam => normalizeCourseTitle(exam.courseTitle)),
    ...existingCourseTitles
  ])];
  const { byCourse: courseProjects, createdCount: projectCount } = await ensureCourseProjects(db, uid, courseTitles, ts);
  const payloads = [
    ...items.map(item => itemPayload(item, uid, ts, courseProjects.get(normalizeCourseTitle(item.courseTitle))?.id)),
    ...exams.map(exam => examPayload(exam, uid, ts, courseProjects.get(normalizeCourseTitle(exam.courseTitle))?.id))
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
    const projectRef = courseProjects.get(normalizeCourseTitle(data.courseTitle));
    if (projectRef && data.projectId !== projectRef.id) {
      ops.push(batch => batch.set(doc.ref, { projectId: projectRef.id, syncedAt: ts }, { merge: true }));
    }
    if (!activeKeys.has(key) && !data.archived) {
      ops.push(batch => batch.set(doc.ref, { archived: true, syncedAt: ts }, { merge: true }));
    }
  });

  const lastCourseCount = discoverCourseKjs(pages || []).length;
  ops.push(batch => batch.set(connectionRef, {
    lastSyncedAt: ts,
    lastError: null,
    lastItemCount: items.length,
    lastExamCount: exams.length,
    lastProjectCount: projectCount,
    lastCourseCount,
    lastSyllabusMetrics: syllabusMetrics || null
  }, { merge: true }));

  await commitInChunks(db, ops);
  return { todoCount: items.length, examCount: exams.length, projectCount };
}

async function syncAll(options = {}) {
  const admin = getAdmin();
  const db = admin.firestore();
  const snapshot = await db.collection('eclass_connections').where('enabled', '==', true).get();
  let todoCount = 0;
  let examCount = 0;
  let projectCount = 0;
  for (const doc of snapshot.docs) {
    try {
      const result = await syncConnection(doc.id, doc.data(), options);
      todoCount += result.todoCount;
      examCount += result.examCount;
      projectCount += result.projectCount || 0;
    } catch (error) {
      await doc.ref.set({
        lastError: error.message || String(error),
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
  return { todoCount, examCount, projectCount };
}

module.exports = { syncAll, syncConnection };
