import { COLLECTIONS, getFirestoreDb } from "@/db/firestore.server"

export type UserRecord = {
  id: string
  username: string
  passwordHash: string
  createdAt: Date
}

/** What the browser is allowed to know about the signed-in learner. */
export type PublicUser = { id: string; username: string }

/**
 * The lowercased username *is* the document id.
 *
 * Firestore has no unique index, so uniqueness has to come from the key itself.
 * A `create()` on this id fails atomically when the name is taken, which no
 * query-then-write could guarantee — two simultaneous registrations would both
 * see an empty result and both succeed.
 */
function userId(username: string): string {
  return username.trim().toLocaleLowerCase("en")
}

function usersCollection() {
  return getFirestoreDb().collection(COLLECTIONS.users)
}

/**
 * Creates the account, or reports that the name is taken.
 *
 * The stored `username` keeps the learner's original capitalisation while the
 * id is folded, so `Dhisa` displays as typed but blocks `dhisa`.
 */
export async function createUser(
  username: string,
  passwordHash: string
): Promise<{ ok: true; user: PublicUser } | { ok: false }> {
  const id = userId(username)

  try {
    await usersCollection().doc(id).create({
      username,
      usernameLower: id,
      passwordHash,
      createdAt: new Date(),
    })
  } catch (cause) {
    // ALREADY_EXISTS (code 6) is the name being taken; anything else is a real
    // failure the caller should not mistake for a duplicate.
    if (
      typeof cause === "object" &&
      cause !== null &&
      (cause as { code?: number }).code === 6
    ) {
      return { ok: false }
    }
    throw cause
  }

  return { ok: true, user: { id, username } }
}

export async function findUserByUsername(
  username: string
): Promise<UserRecord | null> {
  const snapshot = await usersCollection().doc(userId(username)).get()
  const data = snapshot.data()
  if (!data) return null

  return {
    id: snapshot.id,
    username: String(data.username),
    passwordHash: String(data.passwordHash),
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
  }
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const snapshot = await usersCollection().doc(id).get()
  const data = snapshot.data()
  if (!data) return null
  return { id: snapshot.id, username: String(data.username) }
}
