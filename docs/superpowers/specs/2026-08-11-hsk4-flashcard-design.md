# HSK 4 Flashcard Design

## Purpose

Build a focused Indonesian learning application for the latest published HSK 3.0 Level 4 vocabulary. The application helps learners select a targeted set of words or begin a random session, then recall the answer from a Hanzi-first flashcard.

## Scope

- Include exactly the 1,000 vocabulary entries introduced at HSK 4 in the latest published HSK 3.0 syllabus; do not include HSK 1–3 entries.
- Store canonical source data in a version-controlled CSV and seed it into the database.
- Show Hanzi, tone-marked pinyin, Indonesian meaning, and English meaning.
- Sort the vocabulary list by normalized pinyin.
- Search Hanzi, pinyin with or without tone marks, Indonesian meaning, and English meaning.
- Allow a learner to select any number of list items for a study session.
- When nothing is selected, let the learner choose the number of randomly sampled cards from 1 through 1,000.
- Start each flashcard with only Hanzi visible. A click or keyboard activation flips the card to show pinyin, Indonesian meaning, and English meaning.
- Let a single administrator sign in and add, edit, or delete manual vocabulary entries.
- Deploy one TanStack Start application to Vercel.

## Chosen Architecture

The application is a TanStack Start monolith. Its route components render the public pages, server functions provide vocabulary and admin mutations, and a Turso/libSQL database persists shared data. Drizzle ORM owns the schema, migrations, and type-safe queries. Turso is SQLite-compatible but hosted remotely, so the database remains persistent across Vercel function invocations.

The administrator login does not create public accounts. The server compares a submitted password against `ADMIN_PASSWORD` and issues a signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie using `ADMIN_SESSION_SECRET`. Every administrative server function verifies the cookie before it reads or changes protected data.

## Data and Provenance

`data/hsk4-3.0.csv` is the reproducible input dataset. Each row holds:

```text
external_id,hanzi,pinyin,translation_id,translation_en,source_name,source_url,source_version,verified_at
```

The authoritative HSK 3.0 syllabus determines which 1,000 words belong to Level 4. The canonical source is the November 2025 CLEC outline, published at `https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf`. Pinyin and English glosses are recorded from traceable reference material and compared with the canonical entry. Indonesian meanings are concise study glosses, verified against the English meaning, and remain editable only by the administrator. The project documents the source URL, source version, and verification date for every built-in row.

HSK 3.0 is the requested learning target, not a claim about the active exam format at every test centre. CLEC describes the 3.0 examination as globally piloted and says the formal start date is announced separately. The application labels the deck “HSK 3.0 (latest published syllabus)” to make that distinction clear.

Database records preserve this provenance and add a `kind` field:

- `official` rows originate in the CSV and retain their provenance.
- `manual` rows are administrator-created and record their creation and update timestamps.

The database enforces uniqueness for the `(hanzi, pinyin)` pair. This supports distinct pronunciations for the same character while preventing accidental duplicates. The seed operation is idempotent: it inserts missing official entries and never overwrites manual rows or administrator edits.

## Public Experience

The selected visual direction is **Meja belajar**: spare, purposeful, and typographic rather than a generic analytics dashboard. The main vocabulary screen uses a compact, responsive grid/list of selectable word cards. Each card gives Hanzi visual priority, then pinyin, Indonesian translation, and a quieter English confirmation line. A concise header shows the active selection count and the primary action to begin studying.

Search is a single input that matches all four fields. The query normalizer lowercases Latin text, removes spacing differences, and removes pinyin diacritics so `anpai`, `ān pái`, and `ĀNPÁI` find `安排`.

When one or more cards are selected, starting a session studies exactly that set in a shuffled order. When none are selected, the learner chooses a count and the application samples that many unique official and manual words at random.

The study page has a prominent, focusable card. Its front shows only the Hanzi. Activating the card flips it to pinyin, Indonesian meaning, and English meaning. Prev/next controls work by pointer and keyboard, show position within the session, and do not alter the original selected set.

## Admin Experience

`/admin` first shows the password form. An authenticated administrator can open a compact vocabulary management screen with a create form and an editable searchable table. The form requires Hanzi, tone-marked pinyin, Indonesian translation, and English translation. It reports field-specific validation errors, warns on an existing `(hanzi, pinyin)` pair, and preserves submitted values on an error. Official-source metadata is visible but cannot be removed from official entries.

## Failure Handling

- A public database read failure shows a clear unavailable state and retry action. It never presents an empty vocabulary list as a successful response.
- Invalid random-session counts, missing admin form fields, malformed pinyin, and duplicate word/pronunciation pairs return actionable validation messages.
- Unauthorized admin requests return an authentication failure without exposing protected mutations.
- Mutation failures leave the existing list visible and keep valid form input intact.

## Testing Strategy

- Unit tests cover pinyin normalization, combined-field search, sorted pinyin ordering, selection-mode input, and unbiased bounded random sampling.
- Server integration tests cover session validation, authorization enforcement, vocabulary validation, duplicate prevention, and idempotent CSV seeding.
- Browser tests cover selecting cards, the selected-versus-random session fork, the Hanzi-first and reveal states of a flashcard, keyboard interaction, and administrator CRUD.
- A data validation test confirms exactly 1,000 official rows, no empty required fields, no duplicate `(hanzi, pinyin)` pairs, and provenance metadata on every official record.

## Deployment Configuration

Vercel receives `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as encrypted environment variables. Local development uses the same names in an uncommitted `.env` file. The deployment guide explains database migration, seeding, source attribution, and secret configuration before the first production release.

## Out of Scope

- Public accounts, learner profiles, spaced-repetition scheduling, and cross-device progress syncing.
- Audio, handwriting recognition, sentences, grammar explanations, and HSK levels other than latest published HSK 3.0 Level 4.
- Offline-first synchronization or direct local SQLite files in Vercel production.
