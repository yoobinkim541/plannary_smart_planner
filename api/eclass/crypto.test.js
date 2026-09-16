const assert = require('assert');
const { encrypt, decrypt } = require('./_crypto');

async function run() {
  const previous = {
    eclassKey: process.env.ECLASS_ENCRYPTION_KEY,
    cronSecret: process.env.CRON_SECRET,
    vercel: process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
  };

  delete process.env.ECLASS_ENCRYPTION_KEY;
  delete process.env.CRON_SECRET;
  process.env.VERCEL = '1';
  assert.throws(() => encrypt('secret'), /Missing ECLASS_ENCRYPTION_KEY/);

  process.env.ECLASS_ENCRYPTION_KEY = 'test-key';
  const encrypted = encrypt('e-class password');
  assert.strictEqual(decrypt(encrypted), 'e-class password');

  if (previous.eclassKey === undefined) delete process.env.ECLASS_ENCRYPTION_KEY;
  else process.env.ECLASS_ENCRYPTION_KEY = previous.eclassKey;
  if (previous.cronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous.cronSecret;
  if (previous.vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previous.vercel;
  if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous.nodeEnv;

  console.log('e-class crypto test passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
