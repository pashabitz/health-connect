import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/activities.mjs';
import { createUploadHandler } from '../api/uploads.mjs';
import { createExportStore, exportPath, MAX_CSV_BYTES } from '../server/exports.mjs';
import { extractActivitiesCsv } from '../src/strava-export.mjs';
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';

async function makeZip(entries) {
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  for (const [name, content] of entries) await writer.add(name, new BlobReader(new Blob([content])));
  return new File([await writer.close()], 'export.zip');
}

test('accepts individual activities CSV without changing its contents', async () => {
  const csv = await extractActivitiesCsv(new File(['csv contents'], 'activities.csv'));
  assert.equal(await csv.text(), 'csv contents');
  assert.equal(csv.type, 'text/csv');
});

test('extracts only the nested activities CSV from an entire export', async () => {
  const zip = await makeZip([['export/activities.csv', 'csv contents'], ['export/profile.csv', 'private profile']]);
  assert.equal(await (await extractActivitiesCsv(zip)).text(), 'csv contents');
});

test('rejects missing and ambiguous CSV entries and corrupt ZIPs', async () => {
  await assert.rejects(extractActivitiesCsv(await makeZip([['profile.csv', 'profile']])), /does not contain/);
  await assert.rejects(extractActivitiesCsv(await makeZip([['activities.csv', 'a'], ['nested/activities.csv', 'b']])), /more than one/);
  await assert.rejects(extractActivitiesCsv(new File(['not a zip'], 'export.zip')));
});

test('rejects unsupported, empty, and oversized individual files', async () => {
  await assert.rejects(extractActivitiesCsv(new File(['data'], 'profile.csv')), /Select activities/);
  await assert.rejects(extractActivitiesCsv(new File([], 'activities.csv')), /between 1 byte and 20 MB/);
  await assert.rejects(extractActivitiesCsv(new File([new Uint8Array(MAX_CSV_BYTES + 1)], 'activities.csv')), /20 MB/);
});

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

test('upload endpoint rejects unauthenticated users before storage access', async () => {
  const upload = createUploadHandler({ authenticate: async () => null, store: {} });
  const response = createResponse();
  await upload({ method: 'POST', body: { action: 'prepare' } }, response);
  assert.equal(response.statusCode, 401);
});

test('upload endpoint uses verified identity, ignoring client identity and paths', async () => {
  const calls = [];
  const upload = createUploadHandler({
    authenticate: async () => 'user_owner',
    store: { prepare: async (userId) => { calls.push(userId); return {}; } },
  });
  const response = createResponse();
  await upload({ method: 'POST', body: { action: 'prepare', userId: 'user_other', pathname: 'other.csv' } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, ['user_owner']);
});

test('export tokens are scoped and dashboard reads only the owner path', async () => {
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = 'test-read-write-token';
  let constraints;
  const paths = [];
  const store = createExportStore({
    generateToken: async (options) => { constraints = options; return 'scoped-token'; },
    read: async (pathname, options) => {
      paths.push(pathname);
      assert.equal(options.access, 'private');
      assert.equal(options.token, 'test-read-write-token');
      return null;
    },
  });
  try {
    const prepared = await store.prepare('user_owner');
    assert.equal(constraints.pathname, prepared.pathname);
    assert.ok(prepared.pathname.startsWith('users/user_owner/uploads/'));
    assert.equal(constraints.maximumSizeInBytes, MAX_CSV_BYTES);
    assert.equal(constraints.allowOverwrite, false);
    assert.deepEqual(constraints.allowedContentTypes, ['text/csv']);
    assert.equal(await store.dashboard('user_other'), null);
    await assert.rejects(store.finalize('user_other', prepared.uploadId), /Upload not found/);
    assert.ok(paths.every((pathname) => pathname.startsWith('users/user_other/')));
    assert.throws(() => exportPath('../other'), /Invalid user/);
    await assert.rejects(store.finalize('user_owner', '../activities'), /Invalid upload/);
  } finally {
    if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  }
});

test('invalid CSV is removed without replacing the previous export', async () => {
  const removed = [];
  const store = createExportStore({
    read: async () => ({ statusCode: 200, stream: new Blob(['invalid']).stream() }),
    write: async () => assert.fail('Invalid data must not be saved'),
    remove: async (pathname) => removed.push(pathname),
  });
  await assert.rejects(store.finalize('user_owner', '12345678-1234-4234-8234-123456789abc'), /not a valid Strava/);
  assert.equal(removed.length, 1);
});

test('valid export replaces only the owner CSV after validation', async () => {
  const header = Array(21).fill('');
  Object.assign(header, { 1: 'Activity Date', 2: 'Activity Name', 3: 'Activity Type', 16: 'Moving Time', 17: 'Distance', 20: 'Elevation Gain' });
  const row = Array(21).fill('');
  Object.assign(row, { 1: '2026-09-30', 2: 'Morning ride', 3: 'Ride' });
  const csv = `${header.join(',')}\n${row.join(',')}`;
  const written = [];
  const store = createExportStore({
    read: async () => ({ statusCode: 200, stream: new Blob([csv]).stream() }),
    write: async (pathname, text, options) => written.push({ pathname, text, options }),
    remove: async () => {},
  });
  const result = await store.finalize('user_owner', '12345678-1234-4234-8234-123456789abc');
  assert.equal(result.activityCount, 1);
  assert.equal(written[0].pathname, 'users/user_owner/activities.csv');
  assert.equal(written[0].options.access, 'private');
  assert.equal(written[0].text, csv);
});

test('server enforces the CSV size limit before saving', async () => {
  const store = createExportStore({
    read: async () => ({ statusCode: 200, stream: new Blob([new Uint8Array(MAX_CSV_BYTES + 1)]).stream() }),
    write: async () => assert.fail('Oversized data must not be saved'),
  });
  await assert.rejects(store.finalize('user_owner', '12345678-1234-4234-8234-123456789abc'), /exceeds 20 MB/);
});

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