import { createClient } from "@libsql/client"
import { createServerOnlyFn } from "@tanstack/react-start"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

export type VocabularyDatabase = ReturnType<typeof drizzle>

function readCredentials() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Copy .env.example to .env and fill it in."
    )
  }
  // A local file: or :memory: URL needs no token; a remote libsql:// one does.
  if (!authToken && url.startsWith("libsql://")) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required for a remote libsql:// database."
    )
  }

  return { url, authToken }
}

let cached: VocabularyDatabase | undefined

/**
 * The shared database handle.
 *
 * Wrapped in `createServerOnlyFn` so that importing this module from a route
 * component fails the build instead of leaking Turso credentials into the
 * browser bundle. The connection is created on first call, not at module load,
 * so importing the module never reads the environment.
 */
export const getDatabase = createServerOnlyFn((): VocabularyDatabase => {
  if (!cached) {
    const { url, authToken } = readCredentials()
    cached = drizzle(createClient({ url, authToken }), { schema })
  }
  return cached
})
