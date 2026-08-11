import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("hashPassword", () => {
  it("accepts the password it hashed", async () => {
    const stored = await hashPassword("kata sandi rahasia")
    expect(await verifyPassword("kata sandi rahasia", stored)).toBe(true)
  })

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("kata sandi rahasia")
    expect(await verifyPassword("kata sandi rahasi", stored)).toBe(false)
    expect(await verifyPassword("", stored)).toBe(false)
  })

  /* A shared salt would let one rainbow table cover every account, and would
     reveal which learners had picked the same password. */
  it("produces a different hash every time, from a random salt", async () => {
    const first = await hashPassword("sama persis")
    const second = await hashPassword("sama persis")

    expect(first).not.toEqual(second)
    expect(await verifyPassword("sama persis", first)).toBe(true)
    expect(await verifyPassword("sama persis", second)).toBe(true)
  })

  it("records the cost parameters so they can be raised later", async () => {
    const stored = await hashPassword("apa saja")
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true)
    expect(stored.split("$")).toHaveLength(6)
  })

  it("treats a corrupt or unknown hash as a failed login, never an error", async () => {
    expect(await verifyPassword("apa saja", "")).toBe(false)
    expect(await verifyPassword("apa saja", "bukan-hash")).toBe(false)
    expect(await verifyPassword("apa saja", "bcrypt$16384$8$1$aa$bb")).toBe(
      false
    )
    expect(await verifyPassword("apa saja", "scrypt$0$8$1$aa$bb")).toBe(false)
    expect(await verifyPassword("apa saja", "scrypt$16384$8$1$aa$bb")).toBe(
      false
    )
  })

  /* The same password typed on two keyboards can arrive as different bytes:
     the accented vowel is one code point on some layouts, and a plain letter
     plus a combining accent on others. Without NFKC the second spelling would
     be rejected as a wrong password. */
  it("normalises unicode so a password survives a different keyboard", async () => {
    const composed = "caf\u00e9"
    const decomposed = "cafe\u0301"
    expect(composed).not.toEqual(decomposed)

    const stored = await hashPassword(composed)
    expect(await verifyPassword(decomposed, stored)).toBe(true)
  })
})
