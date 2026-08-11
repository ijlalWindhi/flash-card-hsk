# Han.note — kosa kata HSK 4

A flashcard app for the 1,000 words **introduced at** HSK 3.0 level 4, with Indonesian
and English meanings. Hanzi first: a card shows only the character until you flip it.

The interface is in Indonesian. This README is in English because it is for whoever
deploys and maintains the app.

- **Data**: `data/hsk4-3.0.csv`, joined from three licensed sources. See
  [`ATTRIBUTION.md`](ATTRIBUTION.md) and [`docs/dataset-provenance.md`](docs/dataset-provenance.md).
- **Stack**: TanStack Start (React 19, Vite), Nitro for the deployable server build,
  Tailwind + shadcn/ui, Drizzle ORM on Turso/libSQL, Zod, Vitest, Playwright.

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
| `VITE_SITE_URL`        | Optional. Overrides the canonical domain. **Public.**        |

Everything above except `VITE_SITE_URL` is read on the server only, and none of it may
be prefixed `VITE_` — that prefix is what puts a value into the browser bundle.

`VITE_SITE_URL` carries the prefix precisely because it *must* reach the browser: it
builds canonical and Open Graph URLs inside `head()`, which runs on both sides. It holds
a public address and no secret. Leave it unset to use the domain baked into
[`src/lib/site.ts`](src/lib/site.ts).

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
| `npm run icons:build`   | Re-render the favicon, app icons and OG card into `public/`.   |

## Deploying to Vercel

This app is server-rendered and its server functions are real HTTP endpoints, so the
deployment needs a function — not a folder of static files.

**That function comes from Nitro.** `nitro()` is in `vite.config.ts`, and it is the piece
that makes the build deployable: on Vercel it detects the platform and writes the
[Build Output API](https://vercel.com/docs/build-output-api) tree at `.vercel/output/`,
with the client assets under `static/` and the SSR handler as
`functions/__server.func`. Locally the same build produces `.output/` for Node.

Without it, `npm run build` only leaves `dist/client` and `dist/server`. Uploading that
gives you a site with no `index.html` at its root and no handler — every request answers
`404: NOT_FOUND`.

Project settings:

| Setting          | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Framework Preset | `Other` — Vercel's `Vite` preset publishes `dist/` as static.  |
| Build Command    | Leave as `npm run build`.                                      |
| Output Directory | Leave empty. `.vercel/output` takes precedence over any value. |
| Node.js Version  | 20 or later.                                                   |

**Do not add a `vercel.json` rewrite or an `app.config.ts`.** A catch-all rewrite to
`index.html` shadows the routes the server functions live on, and
`@tanstack/react-start/config` is not a subpath this version exports.

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
7. `/robots.txt` names the sitemap at the deployed domain, not `localhost`.
8. `/sitemap.xml` returns XML listing six URLs, none of them under `/admin`.
9. View source on `/`: exactly one `<link rel="canonical">`, and it matches the page.

## SEO and icons

Every page sets its own title, description, canonical and social card through
`seo()` in [`src/lib/seo.ts`](src/lib/seo.ts). The root route supplies only
site-wide fallbacks — TanStack keeps the first `title` and the first meta per
`name`/`property` walking matches deepest-first, so a page overrides the root by
saying nothing more than what it changes.

The root deliberately emits **no** canonical link. Links are concatenated rather
than deduplicated by `rel`, so one there would render alongside each page's own
and the pair would name two different URLs for one document.

`robots.txt` and `sitemap.xml` are server routes, not files in `public/`. Both
have to state an absolute domain, and building them from `SITE_URL` is what stops
that domain from outliving a move. [`src/lib/sitemap.ts`](src/lib/sitemap.ts)
holds the route list; a test compares it against the generated route tree, so a
new public page that nobody adds fails the suite instead of going unlisted.

The domain itself lives in [`src/lib/site.ts`](src/lib/site.ts) and can be
overridden with `VITE_SITE_URL`. It is read through `import.meta.env` rather than
`process.env` because `head()` runs in the browser too, where `process` does not
exist.

### Regenerating the icons

```bash
npm run icons:build
```

Renders `favicon.svg`, `favicon.ico`, `icon-192.png`, `icon-512.png`,
`apple-touch-icon.png` and `og-image.png` from the vector source in
[`scripts/icon-art.ts`](scripts/icon-art.ts). **The output is committed**, and no
deploy runs this — which keeps a native rasteriser out of the production build.

Two details worth knowing before editing the art:

- **The mark is drawn twice.** At 16px the outlined card behind is a
  two-thirds-of-a-pixel line that antialiases into grey mush, so that size gets a
  simpler cut with no rotation and a filled back card.
- **Only the OG card contains text**, and it is the only render that loads system
  fonts. The icons are pure geometry on purpose: an SVG with text rasterises
  differently on every machine, and to nothing at all where the font is absent.

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
