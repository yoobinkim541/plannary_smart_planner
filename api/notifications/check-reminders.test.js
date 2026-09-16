const assert = require('assert');
const handler = require('./check-reminders');

function response() {
  const result = { statusCode: 200, body: null };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
}

async function run() {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;

  const missingSecret = response();
  await handler({ headers: {} }, missingSecret);
  assert.strictEqual(missingSecret.result.statusCode, 401);

  process.env.CRON_SECRET = 'test-secret';
  const wrongSecret = response();
  await handler({ headers: { authorization: 'Bearer wrong-secret' } }, wrongSecret);
  assert.strictEqual(wrongSecret.result.statusCode, 401);

  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;

  console.log('reminder authorization test passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
