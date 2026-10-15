/**
 * Imports every seed file into the configured Turso/libSQL database.
 *
 * Run with `npm run db:seed`, after `npm run db:migrate`. Safe to re-run: rows
 * already present are skipped, so administrator edits and manual entries are
 * never overwritten.
 *
 * The two syllabuses share 132 words. Those are seeded twice on purpose — once
 * per syllabus, under different `external_id`s — because each word list is
 * browsed on its own and a row has to belong to exactly one of them. The
 * `(hanzi, pinyin)` unique index is scoped to manual rows, so the overlap is
 * not a constraint violation. See data/README.md.
 */
import { createClient } from "@libsql/client"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/libsql"
import { seedOfficialVocabulary } from "../src/features/vocabulary/vocabulary.server"
import { DATASETS, loadDataset, validateDataset } from "./validate-hsk4-dataset"
import type { VocabularyCsvRow } from "./validate-hsk4-dataset"

config()

/** Every seed row, refusing the whole import if any file is malformed. */
function loadAllDatasets(): Array<VocabularyCsvRow> {
  const problems: Array<string> = []
  const rows: Array<VocabularyCsvRow> = []

  for (const dataset of DATASETS) {
    const fileRows = loadDataset(dataset.file)
    const validation = validateDataset(
      fileRows,
      dataset.sourceVersion,
      dataset.level
    )

    problems.push(
      ...validation.invalidRows.map(
        ({ line, reason }) => `${dataset.file}:${line} ${reason}`
      ),
      ...validation.duplicatePairs.map((pair) => `duplicate entry: ${pair}`)
    )
    if (fileRows.length !== dataset.expectedRows) {
      problems.push(
        `${dataset.file}: ${fileRows.length} rows, expected ${dataset.expectedRows}`
      )
    }
    rows.push(...fileRows)
  }

  if (problems.length > 0) {
    throw new Error(
      `refusing to seed invalid data:\n  ${problems.join("\n  ")}`
    )
  }
  return rows
}

async function main() {
  const rows = loadAllDatasets()

  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Copy .env.example to .env first."
    )
  }
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!authToken && url.startsWith("libsql://")) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required for a remote libsql:// database."
    )
  }

  const db = drizzle(createClient({ url, authToken }))
  const report = await seedOfficialVocabulary(db, rows)

  process.stdout.write(`${JSON.stringify(report)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})
