import path from "node:path"

/**
 * Shared browser-test configuration.
 *
 * The port and database are deliberately distinct from the development
 * defaults so a running `npm run dev` is never touched, and the database is a
 * throwaway local file — never a Turso URL.
 */
export const E2E_PORT = 3100
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

export const E2E_DB_FILE = path.resolve(process.cwd(), ".cache/e2e.db")
export const E2E_DATABASE_URL = `file:${E2E_DB_FILE}`

export const E2E_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password"
export const E2E_ADMIN_SESSION_SECRET =
  process.env.E2E_ADMIN_SESSION_SECRET ??
  "e2e-session-secret-with-at-least-32-bytes"
