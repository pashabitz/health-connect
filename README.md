# Local Activity Dashboard

A local-only dashboard for activity statistics and a searchable activity table. The app reads `export_3494176/activities.csv` directly through a development API; it does not create a data snapshot, serve the CSV, or use GPS/recording files.

## Run locally

From `web/`, install dependencies once with `npm install`, then start with `npm run dev`. Open the localhost URL printed by Vite. The server binds to `127.0.0.1` only.

Use `npm test` for parser and aggregation tests and `npm run build` to check the frontend production build. The generated `web/dist/` is not a standalone deployment: the local API middleware is part of the development server. Before any future Vercel deployment, replace the local CSV loader with a hosted backend and private storage such as S3 or a database.

## Data and privacy

The original `export_3494176/` directory is kept in place and ignored by Git. The dashboard reads only `activities.csv` and returns a limited set of fields to the local browser: activity date, name, type, distance, moving time, and elevation gain, plus aggregate summaries. It does not expose the source CSV, descriptions, filenames, GPS coordinates, media, or recording files. The API is intended for local use only; anyone able to access the local app can see the displayed activity names and metrics.

The CSV remains the source of truth. To refresh, replace/update it from a new export while the app is stopped, then restart the development server. No export files are edited by the app.
