import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/activities.mjs';

function createResponse() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('Vercel activities endpoint rejects requests without a session token', async () => {
  const originalSecretKey = process.env.CLERK_SECRET_KEY;
  process.env.CLERK_SECRET_KEY = 'test-secret';
  try {
    const response = createResponse();
    await handler({ method: 'GET', headers: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.body, { error: 'Unauthorized' });
    assert.equal(response.headers['Cache-Control'], 'no-store');
  } finally {
    if (originalSecretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalSecretKey;
  }
});