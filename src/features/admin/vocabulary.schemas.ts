import { z } from "zod"

/**
 * The shape of a manual entry, shared by the form and the server function.
 *
 * One definition means the browser and the server cannot disagree about what
 * counts as valid, and the messages the form renders are the messages the
 * server would have produced.
 */
export const manualVocabularySchema = z.object({
  id: z.string().uuid().optional(),
  hanzi: z.string().trim().min(1, "Hanzi wajib diisi.").max(40, "Hanzi terlalu panjang."),
  pinyin: z
    .string()
    .trim()
    .min(1, "Pinyin wajib diisi.")
    .max(120, "Pinyin terlalu panjang."),
  translationId: z
    .string()
    .trim()
    .min(1, "Arti Indonesia wajib diisi.")
    .max(240, "Arti Indonesia terlalu panjang."),
  translationEn: z
    .string()
    .trim()
    .min(1, "Arti Inggris wajib diisi.")
    .max(240, "Arti Inggris terlalu panjang."),
})

export type ManualVocabularyInput = z.infer<typeof manualVocabularySchema>

/** Which input a message belongs beside; `form` is for whole-request failures. */
export type MutationField = keyof ManualVocabularyInput | "form"

export type FieldError = { field: MutationField; message: string }

export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Array<FieldError> }

export function toFieldErrors(error: z.ZodError): Array<FieldError> {
  return error.issues.map((issue) => ({
    field: (issue.path[0] as MutationField | undefined) ?? "form",
    message: issue.message,
  }))
}
