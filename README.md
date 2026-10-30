# WiFIW Forever

The historical WiFIW rankings and match archive. This React, TypeScript, and Vite site reads the public WiFIW data from Supabase.

## Run locally

```bash
npm ci
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then run:

```bash
npm run dev
```

Build the static site with `npm run build`; the output is in `dist/`.

## Deploy with GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes the site whenever `main` changes. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

Add these repository Actions secrets before the first deployment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The publishable key is included in the browser bundle by design. Do not use a Supabase secret or service-role key in this frontend. The database must allow the required read-only queries for the anon/publishable role.

## Data

The app reads championship, ranking, final table, and match records from the `wifiw_*` Supabase tables. Match score views ignore entries that are not numeric scores, such as penalty notes.

The `.env` file and generated `dist/` output are gitignored.
