import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
  endAdminSession,
  hasAdminSession,
  startAdminSession,
} from "./auth.server"

/**
 * The RPC surface for the admin session.
 *
 * Every server-only import is used exclusively inside a `.handler()` body:
 * that is what lets the bundler strip it from the client, and what keeps
 * `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` out of the browser.
 */
const loginSchema = z.object({ password: z.string().min(1, "Kata sandi wajib diisi.") })

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(({ data }) => startAdminSession(data.password))

export const logoutFn = createServerFn({ method: "POST" }).handler(() => {
  endAdminSession()
  return { ok: true as const }
})

/** Used by the `/admin` loader to decide between the form and the editor. */
export const getAdminSessionFn = createServerFn({ method: "GET" }).handler(
  async () => ({ authenticated: await hasAdminSession() }),
)
