const admin = require('firebase-admin');

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const credentials = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
  } else {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'planary-a2f6b' });
  }
  return admin;
}

async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw Object.assign(new Error('Missing auth token'), { statusCode: 401 });
  const decoded = await getAdmin().auth().verifyIdToken(token);
  return decoded;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  sendJson(res, 405, { error: 'Method not allowed' });
  return false;
}

module.exports = { getAdmin, getUserFromRequest, sendJson, allowMethods };
