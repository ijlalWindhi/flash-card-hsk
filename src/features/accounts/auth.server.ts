import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server"
import { parseCookie, stringifySetCookie } from "cookie"
import { SignJWT, jwtVerify } from "jose"
import { hashPassword, verifyPassword } from "./password"
import { createUser, findUserById, findUserByUsername } from "./users.server"
import type { AuthResult } from "./auth.schemas"
import type { PublicUser } from "./users.server"

export const USER_COOKIE = "hsk4_user"

/** Thirty days: a study habit should not be interrupted by a login screen. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

function signingKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export function readUserSecret(): string {
  const secret = process.env.USER_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "USER_SESSION_SECRET must be set to at least 32 characters. See .env.example."
    )
  }
  return secret
}

/**
 * Issues the session token.
 *
 * Unlike the admin token this carries a subject, because the session has to say
 * *which* learner it belongs to. Nothing else goes in: the username is looked
 * up server-side, so a tampered payload cannot rename anyone.
 */
export function issueUserToken(
  userId: string,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(signingKey(secret))
}

/** Returns the user id carried by a valid token, or null. Never throws. */
export async function readUserToken(
  token: string | undefined,
  secret: string
): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, signingKey(secret), {
      algorithms: ["HS256"],
    })
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }
}

export function serializeUserCookie(token: string): string {
  return stringifySetCookie({
    name: USER_COOKIE,
    value: token,
    ...cookieOptions(),
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function serializeUserLogoutCookie(): string {
  return stringifySetCookie({
    name: USER_COOKIE,
    value: "",
    ...cookieOptions(),
    maxAge: 0,
  })
}

export function readUserCookie(header: string | null): string | undefined {
  if (!header) return undefined
  return parseCookie(header)[USER_COOKIE]
}

async function setSession(userId: string): Promise<void> {
  setResponseHeader(
    "Set-Cookie",
    serializeUserCookie(await issueUserToken(userId, readUserSecret()))
  )
}

/** The signed-in learner's id, or null for a guest. Cheap: no database read. */
export async function currentUserId(): Promise<string | null> {
  return readUserToken(
    readUserCookie(getRequestHeader("cookie") ?? null),
    readUserSecret()
  )
}

/**
 * The signed-in learner, or null for a guest.
 *
 * Guests are a supported state throughout the quiz, so this returns null rather
 * than throwing. A deleted account also lands here: the cookie still verifies,
 * but the lookup finds nothing.
 */
export async function currentUser(): Promise<PublicUser | null> {
  const id = await currentUserId()
  if (!id) return null
  return findUserById(id)
}

/** For the few server functions that genuinely cannot serve a guest. */
export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser()
  if (!user) throw new Error("Masuk terlebih dahulu untuk melanjutkan.")
  return user
}

export async function registerUser(
  username: string,
  password: string
): Promise<AuthResult> {
  const created = await createUser(username, await hashPassword(password))
  if (!created.ok) {
    return {
      ok: false,
      field: "username",
      message: "Nama pengguna sudah dipakai. Coba yang lain.",
    }
  }

  await setSession(created.user.id)
  return { ok: true, user: created.user }
}

/**
 * Checks the credentials and, on success, sets the session cookie.
 *
 * One generic message for both a missing account and a wrong password: telling
 * them apart hands an attacker a way to enumerate who has registered. The hash
 * is still verified against a dummy when no account exists, so the response
 * time does not give away the same fact.
 */
const ABSENT_USER_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86)

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult> {
  const record = await findUserByUsername(username)
  const valid = await verifyPassword(
    password,
    record?.passwordHash ?? ABSENT_USER_HASH
  )

  if (!record || !valid) {
    return {
      ok: false,
      field: "form",
      message: "Nama pengguna atau kata sandi salah.",
    }
  }

  await setSession(record.id)
  return { ok: true, user: { id: record.id, username: record.username } }
}

export function endUserSession(): void {
  setResponseHeader("Set-Cookie", serializeUserLogoutCookie())
}
