import { rm } from "node:fs/promises"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { loadDataset } from "../../scripts/validate-hsk4-dataset"
import { seedOfficialVocabulary } from "../../src/features/vocabulary/vocabulary.server"
import { E2E_DATABASE_URL, E2E_DB_FILE } from "./env"

/**
 * Rebuilds the browser-test database from scratch.
 *
 * Runs as part of Playwright's `webServer` command rather than as a global
 * setup hook: the server is only healthy once the schema exists, and Playwright
 * waits on the server's URL before it runs any setup of its own.
 */
async function main() {
  for (const suffix of ["", "-shm", "-wal"]) {
    await rm(`${E2E_DB_FILE}${suffix}`, { force: true })
  }

  const db = drizzle(createClient({ url: E2E_DATABASE_URL }))
  await migrate(db, { migrationsFolder: "./drizzle" })
  const report = await seedOfficialVocabulary(db, loadDataset())

  process.stdout.write(`e2e database ready: ${JSON.stringify(report)}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`
  )
  process.exit(1)
})
