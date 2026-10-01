import { BlobReader, ZipReader } from '@zip.js/zip.js';

const MAX_CSV_BYTES = 20 * 1024 * 1024;

export async function extractActivitiesCsv(file) {
  if (file.name.toLowerCase() === 'activities.csv') {
    if (!file.size || file.size > MAX_CSV_BYTES) throw new Error('Activities CSV must be between 1 byte and 20 MB.');
    return new Blob([file], { type: 'text/csv' });
  }
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Select activities.csv or a Strava ZIP export.');
  const reader = new ZipReader(new BlobReader(file));
  try {
    let selected;
    for await (const entry of reader.getEntriesGenerator()) {
      if (!entry.directory && entry.filename.split('/').at(-1)?.toLowerCase() === 'activities.csv'
        && !entry.filename.startsWith('__MACOSX/')) {
        if (selected) throw new Error('The ZIP contains more than one activities.csv.');
        selected = entry;
      }
    }
    if (!selected) throw new Error('The ZIP does not contain activities.csv.');
    if (selected.encrypted) throw new Error('Password-protected ZIPs are not supported.');
    if (!selected.uncompressedSize || selected.uncompressedSize > MAX_CSV_BYTES) {
      throw new Error('Activities CSV must be between 1 byte and 20 MB.');
    }
    const chunks = [];
    let size = 0;
    await selected.getData(new WritableStream({
      write(chunk) {
        size += chunk.byteLength;
        if (size > MAX_CSV_BYTES) throw new Error('Activities CSV exceeds 20 MB.');
        chunks.push(chunk);
      },
    }), { checkSignature: true });
    return new Blob(chunks, { type: 'text/csv' });
  } finally {
    await reader.close();
  }
}