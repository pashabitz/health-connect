/// <reference types="node" />

import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { loadDashboardData } from './server/activities.mjs';
import { authenticateRequest } from './server/auth.mjs';

const appRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');
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
        server.middlewares.use('/api/activities', async (request, response) => {
          if (request.method !== 'GET') {
            response.writeHead(405, { Allow: 'GET', 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const userId = await authenticateRequest(request, env.CLERK_SECRET_KEY);
            if (!userId) {
              response.writeHead(401, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
              });
              response.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            const dashboard = await loadDashboardData();
            response.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            });
            response.end(JSON.stringify(dashboard));
          } catch (error) {
            console.error('Could not load the local activity CSV:', error);
            response.writeHead(500, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            });
            response.end(JSON.stringify({ error: 'Could not read activities. Check that the export CSV is present and valid.' }));
          }
        });
      },
    }],
    server: {
      host: '127.0.0.1',
      strictPort: true,
      fs: { strict: true, allow: [appRoot] },
    },
  };
});
