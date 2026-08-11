import { z } from "zod"

/**
 * What a username may be, shared by the forms and the server functions.
 *
 * Restricted to letters, digits, underscore and hyphen so that a name can never
 * be confused with a document id, and so two accounts cannot differ only by an
 * invisible character. Comparison is case-insensitive — see `usernameLower`.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Nama pengguna minimal 3 karakter.")
  .max(24, "Nama pengguna maksimal 24 karakter.")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Nama pengguna hanya boleh berisi huruf, angka, garis bawah, dan tanda hubung."
  )

/**
 * Eight characters, with no composition rules.
 *
 * Length beats character classes: forcing a symbol produces `Password1!`, while
 * a longer passphrase is both easier to remember and harder to guess.
 */
export const passwordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(200, "Kata sandi terlalu panjang.")

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Nama pengguna wajib diisi."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>

/** Which input a message belongs beside; `form` is for whole-request failures. */
export type AuthField = "username" | "password" | "form"

export type AuthResult =
  | { ok: true; user: { id: string; username: string } }
  | { ok: false; field: AuthField; message: string }

/**
 * The first problem, as something a form can render beside a field.
 *
 * Only the first: showing every rule a password broke at once reads as a
 * lecture, and fixing the first usually fixes the rest.
 */
export function firstAuthIssue(error: z.ZodError): {
  field: AuthField
  message: string
} {
  const issue = error.issues[0]
  const path = issue.path[0]
  return {
    field: path === "username" || path === "password" ? path : "form",
    message: issue.message,
  }
}
