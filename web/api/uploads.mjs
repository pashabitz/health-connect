import { authenticateRequest } from '../server/auth.mjs';
import { ExportError, exportStore } from '../server/exports.mjs';

export function createUploadHandler({ authenticate = authenticateRequest, store = exportStore } = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return response.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const userId = await authenticate(request);
      if (!userId) return response.status(401).json({ error: 'Unauthorized' });
      const body = request.body;
      if (body?.action === 'prepare') return response.status(200).json(await store.prepare(userId));
      if (body?.action === 'finalize' && typeof body.uploadId === 'string') {
        return response.status(200).json(await store.finalize(userId, body.uploadId));
      }
      return response.status(400).json({ error: 'Invalid upload request.' });
    } catch (error) {
      if (error instanceof ExportError) return response.status(error.statusCode).json({ error: error.message });
      console.error('Could not upload export:', error);
      return response.status(500).json({ error: 'Could not save export. Check the private Blob store configuration.' });
    }
  };
}

export default createUploadHandler();