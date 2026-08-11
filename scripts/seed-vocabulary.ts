/**
 * Imports `data/hsk4-3.0.csv` into the configured Turso/libSQL database.
 *
 * Run with `npm run db:seed`, after `npm run db:migrate`. Safe to re-run: rows
 * already present are skipped, so administrator edits and manual entries are
 * never overwritten.
 */
import { createClient } from "@libsql/client"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/libsql"
import { seedOfficialVocabulary } from "../src/features/vocabulary/vocabulary.server"
import {
  DATASET_PATH,
  loadDataset,
  validateDataset,
} from "./validate-hsk4-dataset"

config()

async function main() {
  const rows = loadDataset()
  const validation = validateDataset(rows)

  const problems = [
    ...validation.invalidRows.map(
      ({ line, reason }) => `${DATASET_PATH}:${line} ${reason}`
    ),
    ...validation.duplicatePairs.map((pair) => `duplicate entry: ${pair}`),
  ]
  if (problems.length > 0) {
    throw new Error(
      `refusing to seed invalid data:\n  ${problems.join("\n  ")}`
    )
  }

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
