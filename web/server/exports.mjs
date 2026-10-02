import { randomUUID } from 'node:crypto';
import { get, put, del } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { buildDashboardData, parseActivitiesCsv } from './activities.mjs';

export const MAX_CSV_BYTES = 20 * 1024 * 1024;

export class ExportError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function exportPath(userId) {
  if (!/^user_[a-zA-Z0-9]+$/.test(userId)) throw new ExportError('Invalid user ID.');
  return `users/${userId}/activities.csv`;
}

function exportPrefix(userId) {
  return `${exportPath(userId).replace(/activities\.csv$/, '')}exports/`;
}

function latestExportPath(userId) {
  return `${exportPath(userId).replace(/activities\.csv$/, '')}latest-export.json`;
}

function blobOptions(options = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { ...options, token } : options;
}

function stagingPath(userId, uploadId) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(uploadId)) {
    throw new ExportError('Invalid upload ID.');
  }
  return `${exportPath(userId).replace(/activities\.csv$/, 'uploads/')}${uploadId}.csv`;
}

export function createExportStore({ read = get, write = put, remove = del, generateToken = generateClientTokenFromReadWriteToken } = {}) {
  async function readText(pathname, maxBytes = MAX_CSV_BYTES, sizeError = 'Activities CSV exceeds 20 MB.') {
    const result = await read(pathname, blobOptions({ access: 'private', useCache: false }));
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error('Could not read export.');
    const reader = result.stream.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new ExportError(sizeError);
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  async function readCsv(pathname) {
    return readText(pathname);
  }

  return {
    async prepare(userId) {
      const uploadId = randomUUID();
      const pathname = stagingPath(userId, uploadId);
      const token = await generateToken({
        pathname,
        allowedContentTypes: ['text/csv'],
        maximumSizeInBytes: MAX_CSV_BYTES,
        validUntil: Date.now() + 10 * 60 * 1000,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return { uploadId, pathname, token };
    },
    async finalize(userId, uploadId) {
      const pathname = stagingPath(userId, uploadId);
      const csv = await readCsv(pathname);
      if (csv === null) throw new ExportError('Upload not found.', 404);
      let activities;
      try {
        activities = parseActivitiesCsv(csv);
      } catch {
        await remove(pathname, blobOptions());
        throw new ExportError('The file is not a valid Strava activities CSV.');
      }
      const uploadedAt = new Date().toISOString();
      const versionPath = `${exportPrefix(userId)}${uploadedAt.slice(0, 10)}/${Date.parse(uploadedAt)}-${randomUUID()}/activities.csv`;
      await write(versionPath, csv, blobOptions({
        access: 'private', contentType: 'text/csv', addRandomSuffix: false,
        allowOverwrite: false, cacheControlMaxAge: 60,
      }));
      await write(latestExportPath(userId), JSON.stringify({ pathname: versionPath, uploadedAt }), blobOptions({
        access: 'private', contentType: 'application/json', addRandomSuffix: false,
        allowOverwrite: true, cacheControlMaxAge: 60,
      }));
      await remove(pathname, blobOptions()).catch((error) => console.error('Could not remove staged export:', error));
      return { activityCount: activities.length };
    },
    async dashboard(userId) {
      const latestText = await readText(latestExportPath(userId), 4096, 'Latest export pointer is too large.');
      let csv;
      if (latestText !== null) {
        let pointer;
        try {
          pointer = JSON.parse(latestText);
        } catch {
          throw new Error('Latest export pointer is invalid.');
        }
        if (typeof pointer.pathname !== 'string'
          || !pointer.pathname.startsWith(exportPrefix(userId))
          || !pointer.pathname.endsWith('/activities.csv')) {
          throw new Error('Latest export pointer is invalid.');
        }
        csv = await readCsv(pointer.pathname);
        if (csv === null) throw new Error('Latest export file is missing.');
      } else {
        csv = await readCsv(exportPath(userId));
      }
      return csv === null ? null : buildDashboardData(parseActivitiesCsv(csv));
    },
  };
}

export const exportStore = createExportStore();