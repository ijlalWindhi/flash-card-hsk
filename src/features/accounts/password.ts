import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/**
 * scrypt parameters, recorded inside every hash.
 *
 * Storing them means these numbers can be raised later without invalidating a
 * single existing password: an old hash is still verified with the cost it was
 * created at, because `verifyPassword` reads the parameters back out of the
 * string rather than assuming today's values.
 */
const COST = 16384 // N
const BLOCK_SIZE = 8 // r
const PARALLELISATION = 1 // p
const KEY_LENGTH = 64
const SALT_BYTES = 16

/** `scrypt$N$r$p$salt$hash`, all binary parts base64url. */
const SEPARATOR = "$"

function derive(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelisation: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelisation, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key))
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISATION)

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join(SEPARATOR)
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing for a malformed or unknown-algorithm
 * hash: a corrupt row should fail the login, not the request. The comparison
 * is constant time, and both buffers are the same length by construction
 * because they come from the same `KEY_LENGTH`.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(SEPARATOR)
  if (parts.length !== 6) return false

  const [algorithm, cost, blockSize, parallelisation, salt, expected] = parts
  if (algorithm !== "scrypt") return false

  const parsed = [cost, blockSize, parallelisation].map(Number)
  if (parsed.some((value) => !Number.isInteger(value) || value < 1))
    return false

  try {
    const expectedKey = Buffer.from(expected, "base64url")
    if (expectedKey.length !== KEY_LENGTH) return false

    const actualKey = await derive(
      password,
      Buffer.from(salt, "base64url"),
      parsed[0],
      parsed[1],
      parsed[2]
    )

    return timingSafeEqual(actualKey, expectedKey)
  } catch {
    return false
  }
}
