import { defineConfig, devices } from "@playwright/test"
import {
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_SESSION_SECRET,
  E2E_BASE_URL,
  E2E_DATABASE_URL,
  E2E_PORT,
} from "./tests/e2e/env"

/**
 * Which server the suite exercises.
 *
 * `dev` is the fast default. `build` runs the real Nitro output, which is the
 * only way to catch faults that exist solely in the production bundle: Vite
 * leaves `node_modules` external during development, so a dependency that
 * cannot survive being bundled — a CommonJS package reaching for `__dirname`,
 * say — passes every dev test and then fails on every deployed request.
 *
 *   E2E_TARGET=build npm run test:e2e
 */
const TARGET = process.env.E2E_TARGET === "build" ? "build" : "dev"

const SERVER_COMMAND =
  TARGET === "build"
    ? `npx tsx tests/e2e/prepare-database.ts && npm run build && node .output/server/index.mjs`
    : `npx tsx tests/e2e/prepare-database.ts && npx vite dev --port ${E2E_PORT}`

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    // The schema must exist before the server answers its first request, so
    // migrating and seeding is part of starting the server, not a setup hook.
    command: SERVER_COMMAND,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    // Building before serving is most of this budget on the `build` target.
    timeout: TARGET === "build" ? 420_000 : 180_000,
    env: {
      // A throwaway local file, never the production Turso database.
      TURSO_DATABASE_URL: E2E_DATABASE_URL,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: E2E_ADMIN_SESSION_SECRET,
      // The Nitro server reads the port from the environment; `vite dev` takes
      // it as a flag, so setting it here is harmless for the dev target.
      PORT: String(E2E_PORT),
    },
  },
})
