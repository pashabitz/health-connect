import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateRequest } from '../server/auth.mjs';

test('rejects requests without a bearer token', async () => {
  assert.equal(await authenticateRequest({ headers: {} }, 'test-secret'), null);
});

test('rejects malformed bearer tokens', async () => {
  assert.equal(await authenticateRequest({ headers: { authorization: 'Bearer not-a-jwt' } }, 'test-secret'), null);
});

test('requires a server-side Clerk secret key', async () => {
  await assert.rejects(authenticateRequest({ headers: {} }, ''), /CLERK_SECRET_KEY is not configured/);
});