# Activity Ledger

A dashboard for activity statistics and a searchable activity table. The public home is `/`, Clerk sign-in is at `/sign-in`, and `/dashboard` requires a verified Clerk session and redirects signed-out visitors to sign-in. The activity endpoint also verifies the session token.

## Run locally

From `web/`, install dependencies once with `npm install`, then start with `npm run dev -- --config vite.config.ts`. Open the localhost URL printed by Vite. The server binds to `127.0.0.1` only.

Use `npm test` for parser, aggregation, and authentication tests and `npm run build` to check the frontend production build.

## Clerk setup

Create a Clerk application, then copy `web/.env.example` to `web/.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Clerk dashboard. The publishable key is used by the browser; the secret key is only read by the server. Add `http://127.0.0.1:5173` under **Configure → API Keys → Allowed origins** for local development, and add your deployed origin when available. If access should be limited to invited users, restrict sign-ups in Clerk.

For Vercel, set the project root to `web`, use `npm run build` as the build command and `dist` as the output directory, and add both environment variables in the Vercel project settings. `web/vercel.json` rewrites direct visits to `/sign-in` and `/dashboard` to the SPA entry point. Vercel serves `web/api/activities.mjs` as the protected server function. The CSV export is currently ignored by Git and read from a local path, so the deployed API will need a hosted data source before it can return activity data; that migration is intentionally separate.

## Data and privacy

The original `export_3494176/` directory is kept in place and ignored by Git. The dashboard reads only `activities.csv` and returns a limited set of fields to the browser: activity date, name, type, distance, moving time, and elevation gain, plus aggregate summaries. It does not expose the source CSV, descriptions, filenames, GPS coordinates, media, or recording files. The API requires a valid Clerk token; all signed-in users share the same activity data until per-user data ownership is added.

The CSV remains the source of truth. To refresh, replace/update it from a new export while the app is stopped, then restart the development server. No export files are edited by the app.
