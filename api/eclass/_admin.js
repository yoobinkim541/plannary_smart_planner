const admin = require('firebase-admin');

function parseServiceAccount(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  try {
    return JSON.parse(value);
  } catch (error) {
    try {
      return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
    } catch (decodeError) {
      throw new Error('Invalid Firebase service account JSON');
    }
  }
}

function getServiceAccountFromEnv() {
  const parsed = parseServiceAccount(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  );
  if (parsed) return parsed;

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID || 'planary-a2f6b',
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }

  return null;
}

function getAdmin() {
  if (admin.apps.length) return admin;
  const credentials = getServiceAccountFromEnv();
  if (credentials) {
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
  } else {
    if (process.env.VERCEL) {
      throw new Error('Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY in Vercel environment variables.');
    }
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
