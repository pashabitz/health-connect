# Activity Ledger

A dashboard for activity statistics and a searchable activity table. The public home is `/`, Clerk sign-in is at `/sign-in`, and `/dashboard` and `/upload` require a verified Clerk session. Both API endpoints verify the session token. Users without an export are redirected to `/upload`.

## Run locally

From `web/`, install dependencies once with `npm install`, then start with `npm run dev -- --config vite.config.ts`. Open the localhost URL printed by Vite. The server binds to `127.0.0.1` only.

Use `npm test` for parser, aggregation, and authentication tests and `npm run build` to check the frontend production build.

## Clerk setup

Create a Clerk application, then copy `web/.env.example` to `web/.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Clerk dashboard. The publishable key is used by the browser; the secret key is only read by the server. Add `http://127.0.0.1:5173` under **Configure → API Keys → Allowed origins** for local development, and add your deployed origin when available. If access should be limited to invited users, restrict sign-ups in Clerk.

For Vercel, set the project root to `web`, use `npm run build` as the build command and `dist` as the output directory, and add both Clerk environment variables in the Vercel project settings. `web/vercel.json` rewrites direct visits to `/sign-in`, `/dashboard`, and `/upload` to the SPA entry point. Vercel serves the protected functions in `web/api/`.

## Blob storage and imports

Connect the `health-connect` Vercel Blob store to this project and verify its access is **Private**. A public store is not suitable for health exports: authentication on our API does not protect a public Blob URL. Store access must match the SDK's `access: 'private'` setting; create a private store if the existing one is public.

Set the server-only `BLOB_READ_WRITE_TOKEN` environment variable for the connected store. For local development, add it to `web/.env.local`; `vercel env pull` can retrieve it when the store is connected to the Development environment. Never prefix this token with `VITE_`. The store's display name does not go into code; the token identifies the store.

At `/upload`, select either `activities.csv` or a complete Strava ZIP export. ZIPs are read in the browser using zip.js, extracting only the CSV (including one inside an export folder). The archive, GPS files, media, and other CSVs are not uploaded. Missing or multiple activities CSVs, encrypted archives, corrupt archives, and CSVs larger than 20 MB are rejected. Browser extraction reads the archive as a Blob rather than loading all recording files into memory.

The server derives ownership from the verified Clerk token's `sub`, never from a client-provided user ID or path. It issues a short-lived, size-limited upload token for `users/<clerk-user-id>/uploads/<upload-id>.csv`. The CSV uploads directly to Blob, avoiding Vercel's function request-size limit. An authenticated finalization request reads only that user's staging path and validates the Strava CSV schema and rows, then writes an immutable copy under `users/<clerk-user-id>/exports/<UTC-date>/<timestamp>-<id>/activities.csv`. It updates that user's `latest-export.json` pointer only after the versioned CSV is saved. Failed validation preserves the previous pointer and export. No database is needed; concurrent successful imports use last-pointer-write wins.

The dashboard reads the signed-in user's latest pointer and then that immutable CSV through the server, bypassing Blob cache. Imports replace rather than merge activities, while prior versions remain in private storage. Existing users with a legacy `users/<clerk-user-id>/activities.csv` file continue to load it until their next import. Staged files are removed on successful imports and CSV validation failures. Interrupted uploads can leave private staging files; periodically remove old objects under `users/*/uploads/` through storage administration. No webhook or localhost tunnel is required.

## Data and privacy

The original `export_3494176/` directory is kept in place and ignored by Git; it is no longer shared with signed-in users. The dashboard reads each user's privately stored latest `activities.csv` and returns a limited set of fields to the browser: activity date, name, type, distance, moving time, and elevation gain, plus aggregate summaries. It does not expose the source CSV, descriptions, filenames, GPS coordinates, media, or recording files. The full activities CSV is stored privately, including source fields not shown by the dashboard.

The CSV remains the source of truth. To refresh, import a new export at `/upload`. Original local export files are never edited by the app.
