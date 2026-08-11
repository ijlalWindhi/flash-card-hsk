import { createServerFn } from "@tanstack/react-start"
import { isFirestoreConfigured } from "@/db/firestore.server"
import {
  authenticateUser,
  currentUser,
  endUserSession,
  registerUser,
} from "./auth.server"
import { firstAuthIssue, loginSchema, registerSchema } from "./auth.schemas"
import type { AuthResult } from "./auth.schemas"

/**
 * The RPC surface for learner accounts.
 *
 * Server-only imports appear solely inside `.handler()` bodies, which is what
 * lets the bundler strip them and keeps the service-account key and session
 * secret out of the browser.
 */
const NOT_CONFIGURED: AuthResult = {
  ok: false,
  field: "form",
  message:
    "Akun belum tersedia di server ini. Quiz tetap bisa dimainkan tanpa masuk.",
}

const UNAVAILABLE: AuthResult = {
  ok: false,
  field: "form",
  message:
    "Layanan akun sedang tidak tersedia. Quiz tetap bisa dimainkan tanpa masuk.",
}

/**
 * Runs an account operation, turning any infrastructure failure into a message.
 *
 * Credentials being *present* is not the same as their being *usable*: a
 * placeholder private key copied out of `.env.example` passes every
 * `isFirestoreConfigured` check and then throws inside the Firebase SDK. The
 * learner should be told accounts are unavailable and sent back to the quiz,
 * which does not need them — not shown a failed request.
 *
 * The real cause is logged, because it is a deployment fault someone has to
 * see, and it must never travel to the browser.
 */
async function attempt(
  operation: () => Promise<AuthResult>
): Promise<AuthResult> {
  if (!isFirestoreConfigured()) return NOT_CONFIGURED

  try {
    return await operation()
  } catch (cause) {
    console.error("Account operation failed:", cause)
    return UNAVAILABLE
  }
}

export const registerFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<AuthResult> => {
    const parsed = registerSchema.safeParse(data)
    if (!parsed.success) return { ok: false, ...firstAuthIssue(parsed.error) }

    return attempt(() =>
      registerUser(parsed.data.username, parsed.data.password)
    )
  })

export const loginFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<AuthResult> => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) return { ok: false, ...firstAuthIssue(parsed.error) }

    return attempt(() =>
      authenticateUser(parsed.data.username, parsed.data.password)
    )
  })

export const logoutFn = createServerFn({ method: "POST" }).handler(() => {
  endUserSession()
  return { ok: true as const }
})

/**
 * Who is signed in, if anyone.
 *
 * Returns null instead of failing when Firebase is unconfigured, so a
 * development environment without credentials still renders every page as a
 * guest rather than erroring in the root loader.
 */
export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!isFirestoreConfigured()) return null
    try {
      return await currentUser()
    } catch {
      return null
    }
  }
)
