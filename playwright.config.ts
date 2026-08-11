import { defineConfig, devices } from "@playwright/test"
import {
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_SESSION_SECRET,
  E2E_BASE_URL,
  E2E_DATABASE_URL,
  E2E_PORT,
} from "./tests/e2e/env"

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
    command: `npx tsx tests/e2e/prepare-database.ts && npx vite dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // A throwaway local file, never the production Turso database.
      TURSO_DATABASE_URL: E2E_DATABASE_URL,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: E2E_ADMIN_SESSION_SECRET,
    },
  },
})
