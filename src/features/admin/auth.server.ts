import { timingSafeEqual } from "node:crypto"
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server"
import { parseCookie, stringifySetCookie } from "cookie"
import { SignJWT, jwtVerify } from "jose"

export const ADMIN_COOKIE = "hsk4_admin"

/** Twelve hours: long enough for an editing session, short enough to expire. */
const SESSION_TTL_SECONDS = 60 * 60 * 12

function signingKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

/**
 * Issues the session token.
 *
 * The payload carries a role and nothing else — no identity to leak, and
 * nothing an attacker could rewrite into a different account.
 */
export function issueAdminToken(
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(signingKey(secret))
}

export async function isValidAdminToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, signingKey(secret), {
      algorithms: ["HS256"],
    })
    return payload.role === "admin"
  } catch {
    return false
  }
}

/**
 * Compares the submitted password against the configured one in constant time.
 *
 * Buffers of different lengths cannot be compared by `timingSafeEqual`, so both
 * sides are hashed to a fixed width first — otherwise the length check itself
 * would leak. An unset or empty `ADMIN_PASSWORD` never authenticates.
 */
export function isAdminPassword(
  submitted: string,
  expected: string | undefined
): boolean {
  if (!expected) return false

  const encoder = new TextEncoder()
  const a = Buffer.from(encoder.encode(submitted))
  const b = Buffer.from(encoder.encode(expected))
  const width = Math.max(a.length, b.length)

  const padded = (value: Buffer) => {
    const out = Buffer.alloc(width)
    value.copy(out)
    return out
  }

  return timingSafeEqual(padded(a), padded(b)) && a.length === b.length
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }
}

export function serializeAdminCookie(token: string): string {
  return stringifySetCookie({
    name: ADMIN_COOKIE,
    value: token,
    ...cookieOptions(),
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function serializeLogoutCookie(): string {
  return stringifySetCookie({
    name: ADMIN_COOKIE,
    value: "",
    ...cookieOptions(),
    maxAge: 0,
  })
}

/** Pulls the session token out of a request's `Cookie` header. */
export function readAdminCookie(header: string | null): string | undefined {
  if (!header) return undefined
  return parseCookie(header)[ADMIN_COOKIE]
}

export function readAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to at least 32 characters. See .env.example."
    )
  }
  return secret
}

/** Reads the session token off the incoming request. */
function currentToken(): string | undefined {
  return readAdminCookie(getRequestHeader("cookie") ?? null)
}

export async function hasAdminSession(): Promise<boolean> {
  return isValidAdminToken(currentToken(), readAdminSecret())
}

/**
 * Rejects the request unless it carries a valid administrator session.
 *
 * Every protected server function calls this first. It throws rather than
 * returning a flag so a handler cannot forget to check the result.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await hasAdminSession())) {
    throw new Error("Tidak diizinkan. Masuk sebagai admin terlebih dahulu.")
  }
}

/** Checks the password and, on success, sets the session cookie. */
export async function startAdminSession(
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  // One generic message: distinguishing "no password configured" from "wrong
  // password" tells an attacker more than it tells a legitimate admin.
  if (!isAdminPassword(password, process.env.ADMIN_PASSWORD)) {
    return { ok: false, message: "Kata sandi salah." }
  }

  setResponseHeader(
    "Set-Cookie",
    serializeAdminCookie(await issueAdminToken(readAdminSecret()))
  )
  return { ok: true }
}

export function endAdminSession(): void {
  setResponseHeader("Set-Cookie", serializeLogoutCookie())
}
