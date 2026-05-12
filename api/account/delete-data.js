const { getAdmin, getUserFromRequest, sendJson, allowMethods } = require('../eclass/_admin');

async function deleteCollectionByUid(db, name, uid) {
  let snapshot = await db.collection(name).where('uid', '==', uid).limit(300).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    snapshot = await db.collection(name).where('uid', '==', uid).limit(300).get();
  }
}

module.exports = async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  try {
    const user = await getUserFromRequest(req);
    const admin = getAdmin();
    const db = admin.firestore();
    const collections = ['todos', 'notes', 'projects', 'bookmarks', 'wiki_pages', 'eclass_items'];
    for (const name of collections) {
      await deleteCollectionByUid(db, name, user.uid);
    }
    await db.collection('eclass_connections').doc(user.uid).delete().catch(() => {});
    await db.collection('users').doc(user.uid).delete().catch(() => {});
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('[account/delete-data]', error);
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Account data delete failed' });
  }
};
