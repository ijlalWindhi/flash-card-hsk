import { z } from "zod"

/**
 * What the browser reports when a quiz ends.
 *
 * Grading happens client-side, so this payload is asserted rather than proven.
 * It is still validated: the numbers have to be internally consistent before
 * they are allowed to touch anyone's statistics, which stops a malformed or
 * truncated request from writing nonsense that later reads as a record.
 */
export const quizResultSchema = z
  .object({
    mode: z.enum(["choice", "match", "typing", "truefalse"]),
    source: z.enum(["flashcard", "random", "selected", "review"]),
    bestStreak: z.number().int().min(0).max(1000),
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
    words: z
      .array(
        z.object({
          wordId: z.string().min(1).max(120),
          hanzi: z.string().min(1).max(40),
          correct: z.boolean(),
        })
      )
      .min(1, "Sesi kosong tidak bisa dicatat.")
      .max(1000, "Sesi terlalu panjang."),
  })
  .refine((value) => value.bestStreak <= value.words.length, {
    message: "Beruntun tidak mungkin melebihi jumlah jawaban.",
    path: ["bestStreak"],
  })

export type QuizResultInput = z.infer<typeof quizResultSchema>
