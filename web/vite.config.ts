/// <reference types="node" />

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import activitiesHandler from './api/activities.mjs';
import uploadsHandler from './api/uploads.mjs';

const appRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');
  for (const key of ['CLERK_SECRET_KEY', 'BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'VERCEL_OIDC_TOKEN']) {
    if (env[key]) process.env[key] = env[key];
  }
  return {
    root: appRoot,
    plugins: [{
      name: 'local-activities-api',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
          if (pathname.toLowerCase().endsWith('.csv') || /\/export_[^/]+(?:\/|$)/i.test(pathname)) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
            response.end('Not found');
            return;
          }
          next();
        });
        for (const [path, handler] of [['/api/activities', activitiesHandler], ['/api/uploads', uploadsHandler]] as const) {
          server.middlewares.use(path, async (request, response) => {
            const adaptedResponse = {
              setHeader: (name: string, value: string) => response.setHeader(name, value),
              status(code: number) { response.statusCode = code; return this; },
              json(body: unknown) {
                response.setHeader('Content-Type', 'application/json; charset=utf-8');
                response.end(JSON.stringify(body));
                return this;
              },
            };
            try {
              let body;
              if (request.method === 'POST') {
                const chunks: Buffer[] = [];
                let size = 0;
                for await (const chunk of request) {
                  size += chunk.length;
                  if (size > 16384) { adaptedResponse.status(413).json({ error: 'Request too large.' }); return; }
                  chunks.push(chunk);
                }
                body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              }
              await handler(Object.assign(request, { body }), adaptedResponse);
            } catch {
              adaptedResponse.status(400).json({ error: 'Invalid request.' });
            }
          });
        }
      },
    }],
    server: {
      host: '127.0.0.1',
      strictPort: true,
      fs: { strict: true, allow: [appRoot] },
    },
  };
});
