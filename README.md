# Han.note — kosa kata HSK 4

A flashcard app for the 1,000 words **introduced at** HSK 3.0 level 4, with Indonesian
and English meanings. Hanzi first: a card shows only the character until you flip it.

The interface is in Indonesian. This README is in English because it is for whoever
deploys and maintains the app.

- **Data**: `data/hsk4-3.0.csv`, joined from three licensed sources. See
  [`ATTRIBUTION.md`](ATTRIBUTION.md) and [`docs/dataset-provenance.md`](docs/dataset-provenance.md).
- **Stack**: TanStack Start (React 19, Vite, Nitro), Tailwind + shadcn/ui, Drizzle ORM on
  Turso/libSQL, Zod, Vitest, Playwright.

## Requirements

Node.js 20 or later, and npm. `package-lock.json` is committed; use `npm ci` for
reproducible installs.

## Local development

```bash
npm ci
cp .env.example .env          # then fill it in — see "Environment" below
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3000
```

A local file database is the quickest start — put this in `.env` and leave
`TURSO_AUTH_TOKEN` empty:

```dotenv
TURSO_DATABASE_URL=file:./.cache/dev.db
```

## Environment

| Variable               | Used for                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `TURSO_DATABASE_URL`   | libSQL connection string.                                    |
| `TURSO_AUTH_TOKEN`     | Required for a remote `libsql://` database, not for `file:`. |
| `ADMIN_PASSWORD`       | The single administrator password for `/admin/login`.        |
| `ADMIN_SESSION_SECRET` | HMAC key for the admin session cookie; 32+ characters.       |
| `E2E_ADMIN_PASSWORD`   | Playwright only. Never a production value.                   |

All four are read on the server only. None may be prefixed `VITE_`, which would put them
in the browser bundle.

Generate a session secret with:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

## Scripts

| Script                  | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Development server on port 3000.                               |
| `npm run build`         | Production build.                                              |
| `npm run test:run`      | Unit and server integration tests (Vitest).                    |
| `npm run test:e2e`      | Browser tests (Playwright). Builds its own throwaway database. |
| `npm run typecheck`     | `tsc --noEmit`.                                                |
| `npm run data:build`    | Rebuilds `data/hsk4-3.0.csv` from its upstream sources.        |
| `npm run data:validate` | Gate on row count, provenance and duplicates.                  |
| `npm run db:generate`   | Generate a Drizzle migration from `src/db/schema.ts`.          |
| `npm run db:migrate`    | Apply migrations.                                              |
| `npm run db:seed`       | Import the CSV. Idempotent — safe to re-run.                   |

## Deploying to Vercel

Vercel detects TanStack Start and builds it through Nitro. **Do not set an output
directory, add a `vercel.json` rewrite, or add an `app.config.ts`** — the Vite config in
`vite.config.ts` is the whole build configuration, and a stray rewrite will shadow the
server routes that the app's own server functions live on. Set the project's Node.js
version to 20 or later.

### 1. Create the database

```bash
turso db create hsk4-flashcards
turso db show hsk4-flashcards --url
turso db tokens create hsk4-flashcards
```

### 2. Migrate and seed it

Run these from your machine with `.env` pointing at the Turso database — there is no
migration step inside the deployment:

```bash
npm run db:migrate
npm run db:seed          # prints {"inserted":1000,"skipped":0} the first time
```

Re-running the seed later prints `{"inserted":0,"skipped":1000}` and changes nothing:
it skips on `external_id`, so manual entries and any administrator edits survive.

### 3. Configure secrets

```bash
vercel env add TURSO_DATABASE_URL production preview development
vercel env add TURSO_AUTH_TOKEN production preview development
vercel env add ADMIN_PASSWORD production preview development
vercel env add ADMIN_SESSION_SECRET production preview development
```

Changing a secret needs a redeploy to take effect.

### 4. Deploy and smoke test

```bash
vercel --prod
```

Then check, in order:

1. `/` lists words and reports `1000 kata`.
2. Select one word → **Mulai 1 kartu** → the card shows only the Hanzi, and flips on
   click, `Enter` and `Space`.
3. With nothing selected, **Mulai sesi acak** → enter `20` → the counter reads `01 / 20`.
4. `/admin` redirects to `/admin/login`; a wrong password is refused.
5. Sign in, add a word, confirm it appears on `/`, then delete it.
6. `/about` shows the source links and the CC BY-SA 4.0 notice.

## Release check

```bash
npm ci
npm run data:validate
npm run typecheck
npm run test:run
npm run test:e2e
npm run build
git status --short
```

## Updating the vocabulary

The CSV is generated, not hand-edited:

```bash
npm run data:build -- --refresh
npm run data:validate
npm run db:seed
```

Editorial decisions that are not a mechanical join of the sources are listed in
[`data/README.md`](data/README.md).

## Licence

The application code and the dataset are licensed separately. `data/hsk4-3.0.csv`
derives from CC-CEDICT and CC-CIDICT and is therefore **CC BY-SA 4.0**; redistributing it
means keeping the attribution in [`ATTRIBUTION.md`](ATTRIBUTION.md) and the same licence.
