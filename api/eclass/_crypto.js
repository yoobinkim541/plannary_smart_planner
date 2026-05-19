const crypto = require('crypto');

function getKey() {
  const secret = process.env.ECLASS_ENCRYPTION_KEY || process.env.CRON_SECRET || 'planary-local-dev-eclass-key';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decrypt(value) {
  const [ivText, tagText, encryptedText] = String(value || '').split('.');
  if (!ivText || !tagText || !encryptedText) return '';
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

// Deterministic key derived from e-Class credentials (base URL + username).
// Used to detect and deduplicate connections that share the same e-Class account
// across multiple Planary users, so the sync fetch runs only once per unique
// e-Class identity.
function hashCredentialKey(baseUrl, username) {
  let normalizedBase;
  try {
    const u = new URL(baseUrl || 'https://eclass.seoultech.ac.kr');
    normalizedBase = `${u.protocol}//${u.host}`;
  } catch (_) {
    normalizedBase = 'https://eclass.seoultech.ac.kr';
  }
  return crypto
    .createHash('sha256')
    .update(`${normalizedBase}:${String(username || '').toLowerCase().trim()}`)
    .digest('hex');
}

module.exports = { encrypt, decrypt, hashCredentialKey };
